import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';

import { CompetitorService } from '../competitor.service.js';
import { SerperService } from '../services/serper.service.js';
import { MediaService } from '../services/media.services.js';
import { AliExpressService } from '../aliexpress.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();
const competitorService = new CompetitorService();
const serper = new SerperService();
const media = new MediaService();
const aliService = new AliExpressService();

export async function listenForCandidates() {
  const subscription = pubsub.subscription('candidate-analysis-sub-2', {
    flowControl: { maxMessages: 1 }
  });

  console.log('📡 [AnalysisWorker V1.1] Escuchando PubSub...');

  subscription.on('message', async (message) => {
    const { dbId, itemId, targetCountry } = JSON.parse(message.data.toString());
    
    try {
      const dbRes = await pool.query(`
        SELECT p.*, t.vat_rate, er.rate_to_usd 
        FROM products p 
        JOIN tax_rules t ON p.target_country = t.country_code 
        JOIN exchange_rates er ON t.currency_code = er.currency_code
        WHERE p.id = $1`, [dbId]);

      if (dbRes.rows.length === 0) return message.ack();
      const product = dbRes.rows[0];

      // El cerebro entra en acción
      const analysis = await competitorService.runFullAnalysis(
        product.title_original, 
        targetCountry, 
        parseFloat(product.vat_rate), 
        parseFloat(product.rate_to_usd)
      );

       // [CP-WORKER-1] Revisa la decisión final del Orquestador

      let localImages: string[] = [];
      let finalVideoUrl = product.video_url || null; 

      // MULTIMEDIA: Solo bajamos assets si realmente vamos a publicarlo en la Landing
      if (analysis.isWinner) {
        console.log(`🔥 Winner validado [ID: ${dbId}]. Procesando multimedia...`);
        
        const detail = await aliService.getItemDetail(itemId);

        // Respaldo de video si Ali no tenía
        if (!finalVideoUrl) {
          finalVideoUrl = await serper.getPromotionalVideo(analysis.marketingCopy?.headline || product.title_original);
        }

        if (detail?.images && detail.images.length > 0) {
          localImages = await Promise.all(
            detail.images.slice(0, 5).map((url: string, i: number) => 
              media.downloadAndUploadImage(url, dbId, i)
            )
          );
        }
      }

       // [CP-WORKER-2] A punto de guardar. Asegúrate que JSONB sea válido.

      const updateQuery = `
        UPDATE products SET 
          status = $1, suggested_price_local = $2, net_margin_usd = $3, roi_percent = $4,
          marketing_copy = $5, ai_verdict = $6, local_images = $7, video_url = $8,
          competitor_avg_price = $10, updated_at = NOW()
        WHERE id = $9;
      `;

      await pool.query(updateQuery, [
        analysis.isWinner ? 'WINNER' : 'REJECTED_IA',
        analysis.suggestedPriceLocal,
        analysis.netMarginUsd,
        analysis.roiPercent,
        JSON.stringify(analysis.marketingCopy || {}),
        analysis.verdict,
        JSON.stringify(localImages),
        finalVideoUrl,
        dbId,
        analysis.competitorMinPrice
      ]);

      console.log(`✅ [${targetCountry}] ID ${dbId} procesado: ${analysis.isWinner ? 'WINNER' : 'REJECTED'}`);
      message.ack();

    } catch (error: any) {
      console.error(`❌ Error AnalysisWorker [ID: ${dbId}]:`, error.message);
       // [CP-WORKER-ERROR] Captura la traza si falla el SQL o PubSub
      message.ack(); // Hacemos ack para no bloquear la cola por un mal registro
    }
  });
}