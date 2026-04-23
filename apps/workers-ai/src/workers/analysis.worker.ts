import { PubSub } from '@google-cloud/pubsub';
import { Pool } from 'pg';
import { ScraperService } from '../services/scraper.service';
import { GeminiService } from '../gemini.service';

const pubsub = new PubSub();
const pool = new Pool({ /* config de .env */ });
const scraper = new ScraperService();
const gemini = new GeminiService();

export async function listenForCandidates() {
  const subscription = pubsub.subscription('candidate-analysis-sub');

  subscription.on('message', async (message) => {
    const { dbId, itemId, targetCountry } = JSON.parse(message.data.toString());
    
    try {
      // 1. Obtener datos del producto y reglas fiscales de la DB
      const dbRes = await pool.query(`
        SELECT p.*, t.vat_rate, t.currency_code 
        FROM products p 
        JOIN tax_rules t ON p.target_country = t.country_code 
        WHERE p.id = $1`, [dbId]);

      const product = dbRes.rows[0];

      // 2. Buscar competencia real en el país destino vía Serper
      const marketResults = await scraper.getCompetitorPrices(product.title_original, targetCountry);

      // 3. Análisis de IA (Margen, Copy, Veredicto)
      const analysis = await gemini.analyzeArbitrage(
        { title: product.title_original, price: product.base_cost_usd, shipping: product.shipping_cost_usd },
        marketResults,
        targetCountry,
        product.vat_rate
      );

      // 4. Actualizar el producto con la inteligencia obtenida
      const updateQuery = `
        UPDATE products SET 
          status = $1,
          suggested_price_local = $2,
          net_margin_usd = $3,
          roi_percent = $4,
          marketing_copy = $5,
          ai_verdict = $6,
          competitor_data = $7,
          updated_at = NOW()
        WHERE id = $8;
      `;

      await pool.query(updateQuery, [
        analysis.isWinner ? 'WINNER' : 'REJECTED',
        analysis.suggestedPriceLocal,
        analysis.netMarginUsd,
        analysis.roiPercent,
        JSON.stringify(analysis.marketingCopy),
        analysis.verdict,
        JSON.stringify(marketResults),
        dbId
      ]);

      console.log(`✅ Análisis finalizado para ${itemId} [${targetCountry}]: ${analysis.isWinner ? 'WINNER 🔥' : 'REJECTED ❌'}`);
      message.ack();

    } catch (error) {
      console.error(`❌ Fallo en AnalysisWorker para ${itemId}:`, error);
      message.nack(); // Reintento automático
    }
  });
}