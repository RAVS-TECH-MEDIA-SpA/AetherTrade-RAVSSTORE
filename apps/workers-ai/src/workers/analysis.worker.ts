import { PubSub } from '@google-cloud/pubsub';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Servicios
import { ScraperService } from '../services/scraper.service.js';
import { GeminiService } from '../gemini.service.js';
import { AliExpressService } from '../aliexpress.service.js';
import { SerperService } from '../services/serper.service.js';
import { MediaService } from '../services/media.services.js';

// Configuración de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT || '5432'),
});

const pubsub = new PubSub({
  keyFilename: path.resolve(__dirname, '../../../../key.json')
});

const scraper = new ScraperService();
const gemini = new GeminiService();
const aliService = new AliExpressService();
const serper = new SerperService();
const media = new MediaService();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function listenForCandidates() {
  const subscription = pubsub.subscription('candidate-analysis-sub', {
    flowControl: { maxMessages: 1 }
  });

  console.log('📡 AnalysisWorker: Escuchando flujo de candidatos...');

  subscription.on('message', async (message) => {
    const { dbId, itemId, targetCountry } = JSON.parse(message.data.toString());
    
    try {
      // 1. Obtener reglas fiscales
      const dbRes = await pool.query(`
        SELECT p.*, t.vat_rate FROM products p 
        JOIN tax_rules t ON p.target_country = t.country_code 
        WHERE p.id = $1`, [dbId]);

      if (dbRes.rows.length === 0) return message.ack();
      const vatRate = parseFloat(dbRes.rows[0].vat_rate || "0");

      // 2. Detalle del producto (AliExpress)
      const detail = await aliService.getItemDetail(itemId);

      if (!detail || !detail.available || detail.stock < 15) {
        console.log(`🗑️ [RECHAZADO] ${itemId}: Stock insuficiente.`);
        await pool.query('UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2', ['REJECTED_STOCK', dbId]);
        return message.ack();
      }

      // --- FILTRO DE ENVÍO GRATIS SENIOR ---
      const isFreeShipping = detail.shippingFee === 0 || detail.shippingFee === null;
      if (!isFreeShipping) {
        console.log(`🗑️ [RECHAZADO] ${itemId}: No tiene envío gratis (${detail.shippingFee}).`);
        await pool.query('UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2', ['REJECTED_SHIPPING', dbId]);
        return message.ack();
      }

      // 3. Precios de competencia (Scraping)
      const marketResults = await scraper.getCompetitorPrices(detail.title, targetCountry);

      // 4. Análisis de IA (Gemini)
      const analysis = await gemini.analyzeArbitrage(
        { title: detail.title, price: detail.price, shipping: detail.shippingFee },
        marketResults,
        targetCountry,
        vatRate
      );

      // 5. Enriquecimiento Multimedia (Solo Winners)
      let serperImages: string[] = [];
      let localImages: string[] = [];

      if (analysis.isWinner) {
        console.log(`🔥 Winner detectado! Descargando multimedia...`);
        
        // A. Fotos de Google (Lifestyle)
        serperImages = await serper.getLifestyleImages(analysis.marketingCopy.headline);

        // B. Backup a GCS (Santiago)
        if (detail.images && detail.images.length > 0) {
          localImages = await Promise.all(
            detail.images.slice(0, 5).map((url: string, i: number) => 
              media.downloadAndUploadImage(url, dbId, i)
            )
          );
        }
      }

      // 6. Persistencia Final Integrada
      const updateQuery = `
        UPDATE products SET 
          status = $1, suggested_price_local = $2, net_margin_usd = $3, roi_percent = $4,
          marketing_copy = $5, ai_verdict = $6, competitor_data = $7, 
          stock_quantity = $8, serper_images = $9, local_images = $10,
          is_free_shipping = $11, updated_at = NOW()
        WHERE id = $12;
      `;

      await pool.query(updateQuery, [
        analysis.isWinner ? 'WINNER' : 'REJECTED_IA',
        analysis.suggestedPriceLocal,
        analysis.netMarginUsd,
        analysis.roiPercent,
        JSON.stringify(analysis.marketingCopy),
        analysis.verdict,
        JSON.stringify(marketResults),
        detail.stock,
        JSON.stringify(serperImages),
        JSON.stringify(localImages),
        isFreeShipping,
        dbId
      ]);

      console.log(`✅ [${targetCountry}] Finalizado: ${analysis.isWinner ? 'WINNER 🔥' : 'REJECTED'}`);
      
      message.ack();
      await sleep(15000); 

    } catch (error: any) {
      console.error(`❌ Error en ${itemId}:`, error.message);
      message.nack(); 
    }
  });
}