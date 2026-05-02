import { AliExpressService } from './aliexpress.service.js';
import { ScraperService } from './services/scraper.service.js';
import { GeminiService } from './gemini.service.js';

export class CompetitorService {
  constructor(
    private aliExpress = new AliExpressService(),
    private scraper = new ScraperService(),
    private gemini = new GeminiService()
  ) {}

  async runFullAnalysis(
    query: string, 
    targetCountry: string, 
    vatRate: number, 
    rateToUsd: number,
    landedCostUsd: number,    // <-- Nuevo parámetro
    providedMarketResults: any[] // <-- Nuevo parámetro (inyectado desde el worker)
  ) {
    try {
      if (!query) throw new Error("CompetitorService: Query vacía.");
      
      const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';
      const safeQuery = query || "Producto Genérico";
      const shortTitle = safeQuery.split(' ').slice(0, 5).join(' ');

      // 1. Usamos los resultados ya obtenidos o buscamos en AliExpress si es necesario
      // Nota: Eliminamos la llamada duplicada al scraper aquí porque ya la hizo el worker
      const aliItems = await this.aliExpress.searchTrending(shortTitle, targetCountry);
      const marketResults = providedMarketResults; 

      const bestAli = aliItems[0] || { title: shortTitle, price: 0, shippingCost: 0 };
      const aliData = {
        title: bestAli.title,
        price: parseFloat(bestAli.price?.value || bestAli.price || "0"),
        shipping: parseFloat(bestAli.shipping_value || bestAli.shippingCost || "0")
      };

      // 2. PRECIO MÍNIMO COMPETENCIA
      const competitorMinPrice = marketResults.length > 0 
        ? Math.min(...marketResults.map((res: any) => Number(res.price) || 0)) 
        : 0;

      // 3. IA: ANÁLISIS FINANCIERO
      // Pasamos el landedCostUsd (que ya incluye la absorción de envío local)
      const analysis = await this.gemini.analyzeArbitrage(
        aliData, 
        marketResults, 
        targetCountry, 
        vatRate,
        landedCostUsd
      );

      // 4. LÓGICA DE GANADORES Y VEREDICTO
      // Si hay un competidor sintético o real, permitimos que sea Winner
      let finalWinner = (competitorMinPrice > 0) ? analysis.isWinner : false;
      let finalVerdict = (competitorMinPrice === 0) 
        ? "RECHAZADO: Sin datos de mercado ni motor sintético." 
        : analysis.verdict;
      
      // 5. PROTECCIÓN DE MARGEN "PISO DE MUERTE"
      let finalPrice = analysis.suggestedPriceLocal;

      // Costo local real considerando el Landed Cost absorbido
      const costLocal = landedCostUsd * rateToUsd * (1 + vatRate / 100);

      // Margen mínimo intocable ($6 USD netos tras absorber todo)
      const minMarginLocal = 6 * rateToUsd;
      const absoluteMinPrice = costLocal + minMarginLocal;

      if (competitorMinPrice > 0) {
        // Tackle al 95% del competidor para ser los más baratos
        if (finalPrice > competitorMinPrice) {
          finalPrice = competitorMinPrice * 0.95;
        }
        
        // Si el precio de competencia nos obliga a perder plata, forzamos al mínimo aceptable
        if (finalPrice < absoluteMinPrice) {
          finalPrice = absoluteMinPrice;
          // Si el precio mínimo aceptable es mayor al de la competencia, ya no somos tan "Winners"
          if (finalPrice > competitorMinPrice) finalWinner = false; 
        }
      } else {
        // Océano Azul: Markup agresivo sobre el costo total absorbido
        finalPrice = costLocal * 2.2;
      }

      // 6. REDONDEO PSICOLÓGICO
      if (targetCountry === 'CL') {
        finalPrice = Math.max(990, Math.floor(finalPrice / 1000) * 1000 + 990);
      } else {
        finalPrice = Math.floor(finalPrice) + 0.99;
      }
      
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