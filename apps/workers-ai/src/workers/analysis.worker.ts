// (Mantén tus importaciones actuales arriba...)
import { PubSub } from '@google-cloud/pubsub';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { GeminiService } from '../gemini.service.js';
import { CompetitorService } from '../competitor.service.js';
import { ScraperService } from '../services/scraper.service.js';
import { MediaService } from '../services/media.services.js';
import { SerperService } from '../services/serper.service.js';
import { CJDropshippingService } from '../services/cj.service.js'; 
import { MARKET_CONFIG } from '../config/constants.js';
import { runDiscoveryTask } from '../workers/discovery.worker.js';

export const pubsub = new PubSub({
  projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-local'
});
const cjService = new CJDropshippingService();
const gemini = new GeminiService();
const competitorService = new CompetitorService();
const scraper = new ScraperService();
const media = new MediaService();
const serper = new SerperService();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)));

// ⚡ NUEVO ESCUDO GLOBAL: Función auxiliar para forzar Timeouts en cualquier Promesa
const withTimeout = (promise: Promise<any>, timeoutMs: number, operationName: string) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT_EXTERNAL: ${operationName} demoró más de ${timeoutMs}ms`)), timeoutMs))
  ]);
};

export async function listenForCandidates() {
  const topicName = 'candidate-analysis-2';
  const subscriptionName = 'candidate-analysis-sub-2';

  const topic = pubsub.topic(topicName);
  const [topicExists] = await topic.exists();
  if (!topicExists) await topic.create();

  const subscriptionTest = topic.subscription(subscriptionName);
  const [subExists] = await subscriptionTest.exists();
  if (!subExists) await subscriptionTest.create();

  const subscription = pubsub.subscription(subscriptionName, { flowControl: { maxMessages: 1 } });
  
  subscription.on('error', (error) => {
    console.error('🚨 [Pub/Sub Error] Error en la conexión de la suscripción:', error);
  });

  console.log("📡 [LISTENER] Analysis Worker V6.0 (CJ Engine + Anti-Zombie) | Cabrero listo.");

  subscription.on('message', async (message) => {
    let payload;
    try {
      payload = JSON.parse(message.data.toString());
    } catch (error) {
      message.ack();
      return;
    }

    if (!payload.aliexpress_id || !payload.batchId) {
      try {
        await runDiscoveryTask(payload.batchId, payload.niche, payload.targetCountry, payload.eliteLimit);
      } catch (err) {}
      message.ack();
      return;
    }
    console.log(`\n📡 [Pub/Sub] Mensaje recibido para análisis profundo:`, payload);
    const { aliexpress_id: pid, batchId, targetCountry } = payload;
    const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';
    const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;
    
    let client; 

    try {
      client = await pool.connect(); 
      console.log(`\n🔍 [ANALISIS PROFUNDO] PID: ${pid} | Batch: ${batchId}`);
      
      // ⚡ ESCUDO APLICADO: Máximo 20s para obtener detalles de CJ
      let detail;
      try {
        detail = await withTimeout(cjService.getProductDetail(pid), 20000, 'CJ_GetDetail');
      } catch (e: any) {
         console.warn(` ⏳ PID ${pid} descartado temporalmente por error externo: ${e.message}`);
         // No confirmamos (ack) el mensaje para que PubSub lo reintente si fue un fallo de red
         message.nack(); 
         return;
      }
      
      if (!detail || !detail.variants || detail.variants.length === 0) {
        console.log(` ❌ PID ${pid} descartado: Sin datos o variantes.`);
        message.ack();
        return; 
      }

      const rulesRes = await client.query(`
        SELECT t.vat_rate, er.rate_to_usd, t.gateway_fee_percent
        FROM tax_rules t JOIN exchange_rates er ON t.currency_code = er.currency_code
        WHERE t.country_code = $1 LIMIT 1`, [targetCountry]);
      
      if (rulesRes.rows.length === 0) throw new Error(`Reglas no encontradas`);
      const { vat_rate, rate_to_usd } = rulesRes.rows[0];
      let localizedTitle = detail.productNameEn;
      try {
        localizedTitle = await gemini.translateForSearch(detail.productNameEn, targetLang);
      } catch (translationError: any) {
        console.warn(`⚠️ [Gemini Warn] Fallo al traducir título, usando original:`, translationError.message);
      }
      
      const estimatedShipping = 5.00; 
      const landedCostUsd = Number(detail.sellPrice) + estimatedShipping + config.LAST_MILE_BUFFER;
      const titleForScraping = scraper.cleanProductName(localizedTitle);
      
      console.log(` 🌐 Buscando competencia local para: "${titleForScraping}"...`);
      let marketResults = [];
      try {
        // ⚡ ESCUDO APLICADO: Máximo 35s para Scraper de Competencia
        marketResults = await withTimeout(scraper.getCompetitorPrices(titleForScraping, targetCountry), 35000, 'Scraper_CompetitorPrices');
      } catch (scrapeErr: any) {
         console.warn(`⚠️ [Scraper Warn] Fallo al buscar competencia local (${scrapeErr.message}). Asumiendo mercado sintético exclusivo.`);
      }

      if (!marketResults || marketResults.length === 0) {
        marketResults = [];
        const taxFactor = 1 + (Number(vat_rate) / 100);
        const syntheticPriceLocal = ((landedCostUsd * taxFactor) + Math.max(config.SAFETY_MARGIN * 2, 10)) * Number(rate_to_usd);
        marketResults.push({
          title: "Aether-Market-Engine", price: Math.round(syntheticPriceLocal), source: "Synthetic", link: "", isSynthetic: true
        });
      }

      let analysis: any = null;
      let retries = 0;
      while (retries < 3) {
        try {
          analysis = await competitorService.runFullAnalysis(
            detail.productNameEn, targetCountry, parseFloat(vat_rate), 
            parseFloat(rate_to_usd), landedCostUsd, marketResults, localizedTitle 
          );
          break;
        } catch (aiError: any) {
          if (aiError.message && (aiError.message.includes('429') || aiError.message.includes('exception posting request'))) {
            retries++;
            console.log(`⚠️ [Vertex AI] Intento ${retries}/3 fallido, reintentando en 15s...`);
            await sleep(retries * 15000);
          } else {
            throw aiError;
          }
        }
      }

      if (!analysis || !analysis.isWinner) {
        message.ack();
        return;
      }

      const mainImage = detail.bigImage || detail.productImageSet?.[0] || '';
      
      let finalVideoUrl = '';
      let extraImages: string[] = [];
      
      try {
        // ⚡ ESCUDO APLICADO: Máximo 30s en total para buscar multimedia en Serper
        [finalVideoUrl, extraImages] = await Promise.all([
          withTimeout(serper.getPromotionalVideo(analysis.copywriting?.title_localized || localizedTitle, ''), 20000, 'Serper_Video'),
          withTimeout(serper.getLifestyleImages(analysis.copywriting?.title_localized || localizedTitle), 20000, 'Serper_Images')
        ]);
      } catch (mediaErr: any) {
         console.warn(`⚠️ [Media Warn] Fallo al obtener multimedia externa: ${mediaErr.message}. Usando solo recursos de CJ.`);
      }

      const combinedImages = [...(detail.productImageSet || []).slice(0, 4), ...(extraImages || []).slice(0, 2)];

      let rawLocalImages = [];
      try {
        // ⚡ ESCUDO APLICADO: Máximo 45s para descargar y resubir imágenes
        rawLocalImages = await withTimeout(
           Promise.all(combinedImages.slice(0, 6).map((url, i) => media.downloadAndUploadImage(url, pid, i))),
           45000, 'Media_Upload'
        );
      } catch (uploadErr: any) {
         console.warn(`⚠️ [Media Upload Warn] Fallo la transferencia de imágenes: ${uploadErr.message}`);
      }
      
      const cleanLocalImages = rawLocalImages.filter((img: string) => img && img.trim() !== '');

      await client.query('BEGIN');

      let dbCategoryId = null; 
      const rawCatRes = detail.categoryName || 'General';
      const separator = rawCatRes.includes('>') ? '>' : '/';
      const catParts = rawCatRes.split(separator).map((p: string) => p.trim());
      const finalCategoryName = catParts[catParts.length - 1] || 'General';

      const categorySlug = finalCategoryName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const catRes = await client.query('SELECT id FROM categories WHERE slug = $1', [categorySlug]);
      
      if (catRes.rows.length > 0) {
        dbCategoryId = catRes.rows[0].id;
      } else {
        const newCat = await client.query(`
          INSERT INTO categories (ali_category_id, name, slug) 
          VALUES ($1, $2, $3) 
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name 
          RETURNING id`, 
          [String(detail.categoryId || 'CJ-CAT'), finalCategoryName, categorySlug]
        );
        dbCategoryId = newCat.rows[0].id;
        console.log(`📁 Categoría limpia creada en BD: ${finalCategoryName} (Slug: ${categorySlug})`);
      }

      let dbSupplierId = null;
      if (detail.supplierId) {
        const suppRes = await client.query('SELECT id FROM suppliers WHERE aliexpress_store_id = $1', [String(detail.supplierId)]);
        if (suppRes.rows.length > 0) dbSupplierId = suppRes.rows[0].id;
        else {
          const newSupp = await client.query('INSERT INTO suppliers (aliexpress_store_id, store_name) VALUES ($1, $2) RETURNING id', [String(detail.supplierId), detail.supplierName || 'CJ Supplier']);
          dbSupplierId = newSupp.rows[0].id;
        }
      }

      const insertQuery = `
        INSERT INTO products (
          batch_id, aliexpress_id, title_original, category_id, supplier_id,
          image_url, video_url, local_images, base_cost_usd, shipping_cost_usd, 
          suggested_price_local, suggested_price, roi_percent, net_margin_usd, 
          vat_rate, rate_to_usd, target_country, status, marketing_copy, 
          ai_verdict, raw_details, estimated_transit_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'WINNER', $18, $19, $20, 15)
        ON CONFLICT (aliexpress_id, target_country) DO UPDATE SET 
          updated_at = NOW(), status = 'WINNER', raw_details = EXCLUDED.raw_details,
          video_url = EXCLUDED.video_url, local_images = EXCLUDED.local_images
        RETURNING id;
      `;

      const productRes = await client.query(insertQuery, [
        batchId, pid, detail.productNameEn, dbCategoryId, dbSupplierId, 
        mainImage, finalVideoUrl, JSON.stringify(cleanLocalImages), 
        detail.sellPrice, estimatedShipping, analysis.analysis.suggestedPriceLocal,
        (analysis.analysis.suggestedPriceLocal / parseFloat(rate_to_usd)),
        analysis.analysis.estimatedRoi, analysis.analysis.netMarginUsd,
        parseFloat(vat_rate), parseFloat(rate_to_usd), targetCountry,
        JSON.stringify(analysis.copywriting), analysis.analysis.reasoning, JSON.stringify(detail)
      ]);
      const internalProductId = productRes.rows[0].id;

      const variantList = detail.variants || detail.variantList || [];

      for (const variant of variantList) {
        let colorName = null;
        let sizeName = null;
        
        const vKey = variant.variantKeyEn || variant.variantKey || '';
        if (vKey) {
          const parts = vKey.split('-');
          if (parts.length > 1) {
            colorName = parts[0].trim();
            sizeName = parts.slice(1).join('-').trim(); 
          } else {
            colorName = parts[0].trim();
          }
        }

        let stock = 0;
        try {
          const rawInventories = variant.variantInventories || variant.inventories || '[]';
          const invArray = typeof rawInventories === 'string' ? JSON.parse(rawInventories) : rawInventories;
          
          if (Array.isArray(invArray)) {
            const cnInv = invArray.find((i: any) => i.countryCode === 'CN');
            if (cnInv && cnInv.totalInventory !== undefined) {
              stock = Number(cnInv.totalInventory);
            }
          }
        } catch (e) {}

        const variantId = variant.vid || variant.id;
        const variantPrice = variant.sellPrice || variant.variantSellPrice || detail.sellPrice;
        const variantImage = variant.variantImage || variant.image || mainImage;

        if (!variantId) continue; 

        await client.query(`
          INSERT INTO product_variants (
            product_id, ali_sku_id, color, size, stock, additional_cost_usd, image_url, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (ali_sku_id) DO UPDATE SET 
            color = EXCLUDED.color, 
            size = EXCLUDED.size, 
            stock = EXCLUDED.stock,
            additional_cost_usd = EXCLUDED.additional_cost_usd, 
            image_url = EXCLUDED.image_url,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        `, [
          internalProductId, variantId, colorName, sizeName, stock, variantPrice, variantImage, (stock > 0) 
        ]);
      }

      await client.query('COMMIT');
      await redis.set(`global_proc:${pid}`, '1', 'EX', 86400);
      console.log(` ✅ [GANADOR] ${localizedTitle} guardado en BD con variantes CJ.`);
      
      message.ack();

    } catch (error: any) {
      if (client) await client.query('ROLLBACK');
      console.error(`❌ [ERROR CRÍTICO] PID ${pid}:`, error.message);
      
      if (error.message.includes('TIMEOUT_EXTERNAL')) {
          // Si falló por timeout externo de CJ, rechazamos para reintento en el futuro
          message.nack();
      } else {
          // Si fue un fallo interno grave de BD o parseo, lo confirmamos para no enciclar la cola
          message.ack(); 
      }
    } finally {
      if (client) {
        client.release(); 
      }
    }
  });
}