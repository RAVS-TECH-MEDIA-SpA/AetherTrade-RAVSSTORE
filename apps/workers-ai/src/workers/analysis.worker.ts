import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { GeminiService } from './../gemini.service.js';

import { CompetitorService } from '../competitor.service.js';
import { SerperService } from '../services/serper.service.js';
import { MediaService } from '../services/media.services.js';
import { ScraperService } from '../services/scraper.service.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();
const competitorService = new CompetitorService();
const serper = new SerperService();
const media = new MediaService();
const scraper = new ScraperService();
const gemini = new GeminiService()
// CONFIGURACIÓN FINANCIERA (Aether Standards)
const LOCAL_SHIPPING_ABSORPTION_USD = 5.00; // Lo que "absorbemos" para dar envío gratis al cliente
const MIN_SAFETY_MARGIN_USD = 10.00;        // Margen base para el competidor sintético

export async function listenForCandidates() {
  const subscription = pubsub.subscription('candidate-analysis-sub-2', {
    flowControl: { maxMessages: 1 }
  });

  console.log('📡 [AnalysisWorker V1.2] Escuchando PubSub con Lógica de Absorción...');

  subscription.on('message', async (message) => {
    const { dbId, targetCountry } = JSON.parse(message.data.toString());
    const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';
    
    try {
      // 1. OBTENEMOS DATA COMPLETA (Incluyendo el ID del nicho para telemetría)
      const dbRes = await pool.query(`
        SELECT p.*, t.vat_rate, er.rate_to_usd, n.id as niche_id
        FROM products p 
        JOIN tax_rules t ON p.target_country = t.country_code 
        JOIN exchange_rates er ON t.currency_code = er.currency_code
        LEFT JOIN niche_cache n ON p.title_original ILIKE '%' || n.niche_text || '%'
        WHERE p.id = $1 LIMIT 1`, [dbId]);

      if (dbRes.rows.length === 0) return message.ack();
      const product = dbRes.rows[0];

      // 2. CÁLCULO DE COSTO DE ATERRIZAJE (Landed Cost + Absorción)
      // Sumamos costo Ali + envío Ali + el costo que nosotros pagaremos por el "Envío Gratis" local
          const landedCostUsd = 
        Number(product.base_cost_usd) + 
        Number(product.shipping_cost_usd) + 
        LOCAL_SHIPPING_ABSORPTION_USD;

        const shortTitle = await gemini.translateForSearch(product.title_original, targetLang);
      console.log(`🔍 Query original: "${product.title_original}" -> Optimizado: "${shortTitle}"`);

      // 3. OBTENER COMPETENCIA REAL

      let titleForScraping = scraper.cleanProductName(shortTitle);
      let marketResults = await scraper.getCompetitorPrices(titleForScraping, targetCountry);

      
      // 4. LÓGICA DE COMPETIDOR SINTÉTICO (Aether-Market-Engine)
      // Si no hay competencia, creamos un "ancla" para que la IA no trabaje en el vacío
      if (marketResults.length === 0) {
        const taxFactor = 1 + (parseFloat(product.vat_rate) / 100);
        const exchangeRate = parseFloat(product.rate_to_usd);
        
        // El precio sintético cubre costos, impuestos y deja el margen de seguridad de $10 USD
        const syntheticPriceUsd = (landedCostUsd * taxFactor) + MIN_SAFETY_MARGIN_USD;
        const syntheticPriceLocal = syntheticPriceUsd * exchangeRate;

        marketResults = [{
            title: "Referencia de Mercado (Aether Engine)",
            price: Math.round(syntheticPriceLocal),
            source: "Aether-Market-Engine",
            link: "internal://synthetic-reference", // <-- Añade esto para satisfacer a TS
            isSynthetic: true
        }];
      }

      // 5. ANÁLISIS DE IA (CFO & Director de Marketing)
        const analysis = await competitorService.runFullAnalysis(
          product.title_original, 
          targetCountry, 
          parseFloat(product.vat_rate), 
          parseFloat(product.rate_to_usd),
          landedCostUsd,     // Argumento 5: Costo total absorbido
          marketResults      // Argumento 6: Array de competidores (evita doble fetch)
        );

      // 6. PROCESAMIENTO MULTIMEDIA (Solo para Ganadores)
      let localImages = product.local_images || [];
      let finalVideoUrl = product.video_url || null; 

      if (analysis.isWinner) {
        console.log(`🔥 Winner detectado: ${product.title_original}. Landing Cost: $${landedCostUsd}`);
        
        if (!finalVideoUrl) {
          finalVideoUrl = await serper.getPromotionalVideo(analysis.marketingCopy?.headline || product.title_original);
        }

        const detail = product.raw_details;
        if (detail?.images && (!localImages || localImages.length === 0)) {
          localImages = await Promise.all(
            detail.images.slice(0, 5).map((url: string, i: number) => 
              media.downloadAndUploadImage(url, dbId, i)
            )
          );
        }
      }

      // 7. PERSISTENCIA EN BD
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
        marketResults[0]?.price || 0 // Guardamos el precio del competidor más barato (real o sintético)
      ]);

      // 8. TELEMETRÍA: Actualizamos Niche Stats para el Dashboard
      if (product.niche_id && analysis.isWinner) {
        await pool.query(`
          INSERT INTO niche_stats (niche_id, winners_count, avg_roi)
          VALUES ($1, 1, $2)
          ON CONFLICT (niche_id) DO UPDATE SET 
            winners_count = niche_stats.winners_count + 1,
            avg_roi = (niche_stats.avg_roi + EXCLUDED.avg_roi) / 2,
            recorded_at = NOW();
        `, [product.niche_id, analysis.roiPercent]);
      }

      console.log(`✅ Finalizado [${targetCountry}]: ${analysis.isWinner ? 'WINNER' : 'REJECTED'}`);
      message.ack();

    } catch (error: any) {
      console.error(`❌ Error crítico en AnalysisWorker [ID: ${dbId}]:`, error.stack);
      message.ack(); 
    }
  });
}