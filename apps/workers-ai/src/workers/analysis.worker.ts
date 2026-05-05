import { PubSub } from '@google-cloud/pubsub';
import { pool } from '../lib/db.js';
import { GeminiService } from '../gemini.service.js';
import { CompetitorService } from '../competitor.service.js';
import { ScraperService } from '../services/scraper.service.js';
import { MediaService } from '../services/media.services.js';
import { SerperService } from '../services/serper.service.js';
import { MARKET_CONFIG } from '../config/constants.js';

const pubsub = new PubSub();
const gemini = new GeminiService();
const competitorService = new CompetitorService();
const scraper = new ScraperService();
const media = new MediaService();
const serper = new SerperService();

export async function listenForCandidates() {
  const subscription = pubsub.subscription('candidate-analysis-sub-2', {
    flowControl: { maxMessages: 1 }
  });

  console.log("📡 Escuchando mensajes en 'candidate-analysis-sub-2'...");

  subscription.on('message', async (message) => {
    const { dbId, targetCountry } = JSON.parse(message.data.toString());
    const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';
    const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;

    try {
      console.log(`\n🔍 [ANALISIS] Iniciando proceso para ID: ${dbId} [${targetCountry}]`);

      const dbRes = await pool.query(`
        SELECT p.*, t.vat_rate, er.rate_to_usd, n.id as niche_id
        FROM products p 
        JOIN tax_rules t ON p.target_country = t.country_code 
        JOIN exchange_rates er ON t.currency_code = er.currency_code
        LEFT JOIN niche_cache n ON p.title_original ILIKE '%' || n.niche_text || '%'
        WHERE p.id = $1 LIMIT 1`, [dbId]);

      if (dbRes.rows.length === 0) {
        console.warn(`⚠️ No se encontró el producto con ID ${dbId}.`);
        return message.ack();
      }

      const product = dbRes.rows[0];

      // 1. TRADUCCIÓN Y PREPARACIÓN
      const localizedTitle = await gemini.translateForSearch(product.title_original, targetLang);

      // 2. SCRAPER Y COSTEO
      const landedCostUsd = Number(product.base_cost_usd) + Number(product.shipping_cost_usd) + config.LAST_MILE_BUFFER;
      const titleForScraping = scraper.cleanProductName(localizedTitle);
      
      console.log(`🌐 Buscando competidores para: "${titleForScraping}"...`);
      let marketResults = await scraper.getCompetitorPrices(titleForScraping, targetCountry);

      if (marketResults.length === 0) {
        console.log(`ℹ️ Sin competidores reales. Aplicando Estrategia de Arbitraje.`);
        
        const taxFactor = 1 + (parseFloat(product.vat_rate) / 100);
        const exchangeRate = parseFloat(product.rate_to_usd);
        
        // MEJORA: Sumamos el Buffer de envío local Y aplicamos un Markup (ej. 30%) 
        // para no vender a precio de costo.
        const baseCostWithTax = landedCostUsd * taxFactor;
        const totalOperatingCost = baseCostWithTax + config.LAST_MILE_BUFFER;
        
        // Estrategia: Costo Operativo + Margen deseado (podemos ser más ambiciosos aquí)
        const targetMargin = Math.max(config.SAFETY_MARGIN * 1.5, 5.00); 
        
        const syntheticPriceLocal = (totalOperatingCost + targetMargin) * exchangeRate;
        
        console.log(`[DEBUG] Costo Op: $${totalOperatingCost.toFixed(2)} | Margen Obj: $${targetMargin} | Precio: CLP ${syntheticPriceLocal}`);
        
        // Asignamos este precio al producto para que el validador lo apruebe
        product.suggested_price = syntheticPriceLocal; 
}

      // 3. ANÁLISIS CFO
      const analysis = await competitorService.runFullAnalysis(
        product.title_original, 
        targetCountry, 
        parseFloat(product.vat_rate), 
        parseFloat(product.rate_to_usd),
        landedCostUsd, 
        marketResults,
        localizedTitle 
      );

      // 4. GESTIÓN MULTIMEDIA MEJORADA
      let localImages = product.local_images || [];
      let finalVideoUrl = product.video_url || null; 

      if (analysis.isWinner) {
        // PRIORIDAD 1: Video de AliExpress (si es válido)
        // PRIORIDAD 2: Video Promocional vía Serper con Fallback
        if (!finalVideoUrl || finalVideoUrl.includes('placeholder')) {
          console.log(`🎥 Buscando video promocional de alta fidelidad para el ganador...`);
          const searchTitle = analysis.copywriting?.title_localized || localizedTitle;
          finalVideoUrl = await serper.getPromotionalVideo(searchTitle);
        }
        
        const detail = product.raw_details;
        if (detail?.images && (!localImages || localImages.length === 0)) {
          console.log(`📸 Procesando imágenes para el ganador...`);
          
          // Mezclamos imágenes de AliExpress con una búsqueda de Estilo de Vida (Lifestyle)
          const aliImages = detail.images.slice(0, 4);
          const lifestyleSearch = analysis.copywriting?.title_localized || localizedTitle;
          const extraImages = await serper.getLifestyleImages(lifestyleSearch);
          
          const combinedImages = [...aliImages, ...extraImages.slice(0, 2)];

          localImages = await Promise.all(
            combinedImages.slice(0, 6).map((url: string, i: number) => 
              media.downloadAndUploadImage(url, dbId, i)
            )
          );
        }
      }

      // 5. PERSISTENCIA FINAL
      const updateQuery = `
        UPDATE products SET 
          status = $1, 
          suggested_price_local = $2, 
          net_margin_usd = $3, 
          roi_percent = $4,
          marketing_copy = $5, 
          ai_verdict = $6, 
          local_images = $7, 
          video_url = $8,
          competitor_avg_price = $10, 
          updated_at = NOW()
        WHERE id = $9;
      `;

      await pool.query(updateQuery, [
        analysis.isWinner ? 'WINNER' : 'REJECTED_IA',
        Number(analysis.suggestedPriceLocal) || 0,
        Number(analysis.analysis?.netMarginUsd) || 0,
        Number(analysis.analysis?.estimatedRoi) || 0,
        JSON.stringify(analysis.copywriting || {}),
        analysis.analysis?.reasoning || "Completado",
        JSON.stringify(localImages),
        finalVideoUrl,
        dbId,
        Number(marketResults[0]?.price) || 0
      ]);

      // 6. TELEMETRÍA DE NICHOS
      if (product.niche_id && analysis.isWinner) {
        await pool.query(`
          INSERT INTO niche_stats (niche_id, winners_count, avg_roi)
          VALUES ($1, 1, $2)
          ON CONFLICT (niche_id) DO UPDATE SET 
            winners_count = niche_stats.winners_count + 1,
            avg_roi = (niche_stats.avg_roi + EXCLUDED.avg_roi) / 2,
            recorded_at = NOW();
        `, [product.niche_id, analysis.analysis?.estimatedRoi || 0]);
      }

      console.log(`✅ [${targetCountry}] Finalizado: ${localizedTitle} | Status: ${analysis.isWinner ? 'WINNER' : 'REJECTED'}`);
      message.ack();

    } catch (error: any) {
      console.error(`❌ Error Crítico Worker [ID: ${dbId}]:`, error.stack);
      message.ack(); 
    }
  });
}

listenForCandidates().catch(error => {
  console.error("🚨 Error al iniciar el Worker:", error);
  process.exit(1);
});