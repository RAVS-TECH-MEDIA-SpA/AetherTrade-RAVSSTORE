import { AliExpressService } from './aliexpress.service.js';
import { ScraperService } from './services/scraper.service.js';
import { GeminiService } from './gemini.service.js';

export class CompetitorService {
  constructor(
    private aliExpress = new AliExpressService(),
    private scraper = new ScraperService(),
    private gemini = new GeminiService()
  ) {}

  /**
   * Orquestación de análisis completo.
   * Ahora requiere 'targetCountry' para aplicar lógica fiscal de Chile o España.
   */
  async runFullAnalysis(query: string, targetCountry: string = 'ES', vatRate: number = 21) {
    try {
      console.log(`\n🔍 Analizando mercado [${targetCountry}]: ${query}...`);
      
      // 1. Llamada sincronizada con los nuevos nombres de métodos y parámetros regionales
      const [aliItems, marketResults] = await Promise.all([
        this.aliExpress.searchTrending(query, targetCountry), // Antes era searchProduct
        this.scraper.getCompetitorPrices(query, targetCountry) // Ahora requiere el país
      ]);

      if (!aliItems || aliItems.length === 0) {
        throw new Error(`No se encontraron productos en AliExpress para: ${query}`);
      }

      const bestAli = aliItems[0];
      const aliData = {
        title: bestAli.title,
        price: parseFloat(bestAli.price?.value || "0"),
        shipping: parseFloat(bestAli.shipping_value || "0") // Ajustado según el schema de RapidAPI
      };

      // 2. Análisis de Arbitraje con lógica fiscal dinámica
      const result = await this.gemini.analyzeArbitrage(
        aliData, 
        marketResults, 
        targetCountry, 
        vatRate
      );
      
      return {
        product: aliData.title,
        verdict: result,
        sources: { 
          ali: `https://www.aliexpress.com/item/${bestAli.item_id}.html`, 
          marketCount: marketResults.length 
        }
      };
    } catch (error: any) {
      console.error("❌ Error en la orquestación de CompetitorService:", error.message);
      throw error;
    }
  }
}