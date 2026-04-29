import { AliExpressService } from './aliexpress.service.js';
import { ScraperService } from './services/scraper.service.js';
import { GeminiService } from './gemini.service.js';

export class CompetitorService {
  constructor(
    private aliExpress = new AliExpressService(),
    private scraper = new ScraperService(),
    private gemini = new GeminiService()
  ) {}

  async runFullAnalysis(query: string, targetCountry: string, vatRate: number, rateToUsd: number) {
    try {
      if (!query) throw new Error("CompetitorService: Query vacía.");
      
      const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';

      // 1. RECORTE (Soluciona el error Cannot read properties of undefined reading split)
      const safeQuery = query || "Producto Genérico";
      const shortTitle = safeQuery.split(' ').slice(0, 5).join(' ');

      // 2. LOCALIZACIÓN
      const localizedQuery = await this.gemini.translateForSearch(shortTitle, targetLang);
      
       // [CP-COMP-1] Valida que el término se haya traducido correctamente (Ej: Blender -> Licuadora)

      // 3. DATOS EN PARALELO
      const [aliItems, marketResults] = await Promise.all([
        this.aliExpress.searchTrending(shortTitle, targetCountry),
        this.scraper.getCompetitorPrices(localizedQuery, targetCountry)
      ]);

      const bestAli = aliItems[0] || { title: shortTitle, price: 0, shippingCost: 0 };
      const aliData = {
        title: bestAli.title,
        price: parseFloat(bestAli.price?.value || bestAli.price || "0"),
        shipping: parseFloat(bestAli.shipping_value || bestAli.shippingCost || "0")
      };

        // 4. PRECIO MÍNIMO COMPETENCIA (El rival a vencer)
        const competitorMinPrice = marketResults.length > 0 
          ? Math.min(...marketResults.map((res: { price: any; }) => Number(res.price) || 0)) 
          : 0;

      // 5. IA: ANÁLISIS FINANCIERO Y COPY
      const analysis = await this.gemini.analyzeArbitrage(aliData, marketResults, targetCountry, vatRate);
      
       // [CP-COMP-2] Resultados crudos de la IA antes de aplicar reglas duras

      // 6. REGLA DE ORO V1.1: Si no hay mercado (avg = 0), NO es Winner.
      let finalWinner = (competitorMinPrice > 0) ? analysis.isWinner : false;
      let finalVerdict = (competitorMinPrice === 0) ? "RECHAZADO: Precio mínimo competencia es 0." : analysis.verdict;
      
     // 7. ANCLA DE SEGURIDAD Y PROTECCIÓN DE MARGEN
      let finalPrice = analysis.suggestedPriceLocal;

      // Calculamos el costo real puesto en el país (Costo + Envío + IVA)
      const costLocal = (aliData.price + aliData.shipping) * rateToUsd * (1 + vatRate / 100);

      // Definimos un margen de ganancia mínimo intocable (ej: $5 USD pasados a moneda local)
      const minMarginLocal = 5 * rateToUsd;
      const absoluteMinPrice = costLocal + minMarginLocal;

      if (competitorMinPrice > 0) {
        // Si la IA sugiere un precio mayor al competidor más barato, hacemos el tackle al 95% del competidor
        if (finalPrice > competitorMinPrice) {
          finalPrice = competitorMinPrice * 0.95;
        }
        
        // 🛡️ PISO DE MUERTE: Si por competir nos bajamos demasiado y perdemos plata, 
        // forzamos el precio al mínimo aceptable. (Es mejor no vender que vender a pérdida).
        if (finalPrice < absoluteMinPrice) {
          finalPrice = absoluteMinPrice;
        }
      } else {
        // Si somos exclusivos y no hay competencia, aplicamos un markup agresivo (2.5x)
        finalPrice = costLocal * 2.5;
      }

      // 8. REDONDEO PSICOLÓGICO (Retail Pricing)
      if (targetCountry === 'CL') {
        // Redondea a los 990 más cercanos. Ej: 15430 -> 14990 / 18100 -> 17990
        finalPrice = Math.max(990, Math.floor(finalPrice / 1000) * 1000 + 990);
      } else {
        // Para México (MXN), España (EUR) o USA (USD), termina en .99
        finalPrice = Math.floor(finalPrice) + 0.99;
      }
      
      // Actualizamos el objeto analysis con el precio final blindado
      analysis.suggestedPriceLocal = finalPrice;

    return {
        ...analysis,
        isWinner: finalWinner,
        verdict: finalVerdict,
        suggestedPriceLocal: finalPrice,
        competitorMinPrice: competitorMinPrice,
        aliDetail: bestAli
      };

    } catch (error: any) {
      console.error("❌ Error CompetitorService:", error.message);
      throw error;
    }
  }
}