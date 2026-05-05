import { AliExpressService } from './aliexpress.service.js';
import { ScraperService } from './services/scraper.service.js';
import { GeminiService } from './gemini.service.js';

const MAX_MARKUP_FACTOR = 3.0; 

export class CompetitorService {
  // Eliminamos aliExpress del constructor si no lo usaremos aquí
  constructor(
    private gemini = new GeminiService()
  ) {}

  async runFullAnalysis(
    originalTitle: string, 
    targetCountry: string, 
    vatRate: number, 
    rateToUsd: number,
    landedCostUsd: number,
    providedMarketResults: any[],
    localizedTitle: string 
  ) {
    try {
      // 1. Ya no buscamos en AliExpress aquí. Usamos los datos inyectados.
      const marketResults = providedMarketResults; 
      const competitorMinPrice = marketResults.length > 0 
        ? Math.min(...marketResults.map((res: any) => Number(res.price) || 0)) 
        : 0;

      // 2. IA: ANÁLISIS DE ARBITRAJE
      // Preparamos un objeto dummy para que Gemini no rompa su contrato
      const aliData = {
        title: localizedTitle,
        price: landedCostUsd, // Usamos el costo puesto en destino
        shipping: 0 // Ya está incluido en landedCost
      };

      const analysis = await this.gemini.analyzeArbitrage(
        aliData, 
        marketResults, 
        targetCountry, 
        vatRate,
        landedCostUsd,
        rateToUsd
      );

      const landedCostLocal = (landedCostUsd * rateToUsd);
      const absoluteMaxPriceLocal = landedCostLocal * MAX_MARKUP_FACTOR;

      // 3. LÓGICA DE PRECIO FINAL
      let finalPrice = Number(analysis.analysis?.suggestedPriceLocal) || 0;

      // Techo de Cordura
      if (finalPrice > absoluteMaxPriceLocal) {
        finalPrice = landedCostLocal * 2.2; 
      }

      // Piso de Muerte (Costo + IVA + Margen mínimo de ~6 USD)
      const costWithTaxLocal = landedCostLocal * (1 + vatRate / 100);
      const minMarginLocal = 5000; // Margen mínimo de $5.000 CLP aprox
      const absoluteMinPrice = costWithTaxLocal + minMarginLocal;

      let isWinner = analysis.isWinner;

      if (competitorMinPrice > 0) {
        // Intentamos ser un 5% más baratos que la competencia
        if (finalPrice > competitorMinPrice) finalPrice = competitorMinPrice * 0.95;
        
        // Pero nunca bajamos del Piso de Muerte
        if (finalPrice < absoluteMinPrice) {
          finalPrice = absoluteMinPrice;
          // Si nuestro precio mínimo es más caro que la competencia, NO es ganador
          if (finalPrice > competitorMinPrice) isWinner = false; 
        }
      } else {
        // Si no hay competencia, aplicamos un margen estándar saludable
        finalPrice = landedCostLocal * 2.2;
      }

      // 4. REDONDEO PSICOLÓGICO CHILENO
      if (targetCountry === 'CL') {
        finalPrice = Math.max(990, Math.floor(finalPrice / 1000) * 1000 + 990);
      } else {
        finalPrice = Math.floor(finalPrice) + 0.99;
      }
      
      return {
        ...analysis,
        isWinner: isWinner,
        suggestedPriceLocal: finalPrice,
        competitorMinPrice: competitorMinPrice
      };

    } catch (error: any) {
      console.error("❌ Error CompetitorService:", error.message);
      throw error;
    }
  }
}