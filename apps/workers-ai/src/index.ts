import { AliExpressService } from './aliexpress.service';
import { CompetitorService } from './competitor.service';
import { GeminiService } from './gemini.service';
import { query } from './database';

async function processDiscovery(keywords: string, market: string) {
  const ali = new AliExpressService();
  const comp = new CompetitorService();
  const ai = new GeminiService();

  // 1. Buscar en AliExpress
  const items = await ali.searchProduct(keywords);
  const bestMatch = items[0];

  // 2. Buscar precios de la competencia en el mercado destino
  const marketPrices = await comp.getCompetitorPrices(bestMatch.title, market);

  // 3. Dejar que Gemini analice la viabilidad
  const analysis = await ai.generateStrategy(bestMatch, marketPrices, market);

  // 4. Lógica de Negocio: ¿Es rentable?
  if (analysis.suggestedPrice > bestMatch.price * 1.5) { // Ejemplo: margen > 50%
    await query(
      `INSERT INTO products (sku, aliexpress_id, base_cost_usd, competitor_data, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [bestMatch.sku, bestMatch.id, bestMatch.price, JSON.stringify(marketPrices), 'pending_review']
    );
    console.log(`🔥 Winner detectado: ${bestMatch.title} para mercado ${market}`);
  }
}