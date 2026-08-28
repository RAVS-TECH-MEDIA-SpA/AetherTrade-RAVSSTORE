import { PubSub } from '@google-cloud/pubsub';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { GeminiService } from '../gemini.service.js';
import { CompetitorService } from '../competitor.service.js';
import { ScraperService } from '../services/scraper.service.js';
import { MediaService } from '../services/media.services.js';
import { SerperService } from '../services/serper.service.js';
import { CJDropshippingService } from '../services/cj.service.js'; // ⚡ CJ INYECTADO
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
  
  // ⚡ FIX CRÍTICO 1: Capturador de errores a nivel de suscripción para evitar que Node.js colapse con exit(1)
  subscription.on('error', (error) => {
    console.error('🚨 [Pub/Sub Error] Error en la conexión de la suscripción:', error);
  });

  console.log("📡 [LISTENER] Analysis Worker V6.0 (CJ Engine) | Cabrero listo.");

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
    
    const { aliexpress_id: pid, batchId, targetCountry } = payload;
    const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';
    const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;
    
    let client; // ⚡ Declaramos el cliente afuera para asegurar su liberación en el finally

    try {
      client = await pool.connect(); // ⚡ Movido dentro del try para captura segura y evitar bucles
      console.log(`\n🔍 [ANALISIS PROFUNDO] PID: ${pid} | Batch: ${batchId}`);

      const jitterDelay = Math.floor(Math.random() * (120000 - 10000 + 1)) + 10000;
      await sleep(jitterDelay);
      
      // ⚡ Obtenemos el detalle desde CJ
      const detail = await cjService.getProductDetail(pid);
      
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

      // ⚡ FIX 2: Manejo de errores específico para Gemini para evitar caídas en la primera traducción
      let localizedTitle = detail.productNameEn;
      try {
        localizedTitle = await gemini.translateForSearch(detail.productNameEn, targetLang);
      } catch (translationError: any) {
        console.warn(`⚠️ [Gemini Warn] Fallo al traducir título, usando original:`, translationError.message);
      }
      
      // ⚡ Costo Logístico Estimado (Hasta que implementes la calculadora dinámica)
      const estimatedShipping = 5.00; 
      const landedCostUsd = Number(detail.sellPrice) + estimatedShipping + config.LAST_MILE_BUFFER;
      const titleForScraping = scraper.cleanProductName(localizedTitle);
      
      console.log(` 🌐 Buscando competencia local para: "${titleForScraping}"...`);
      let marketResults = await scraper.getCompetitorPrices(titleForScraping, targetCountry);

      if (marketResults.length === 0) {
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
          // ⚡ FIX 3: Cubrimos explícitamente los fallos generales de Vertex AI y 429
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

      // ⚡ Manejo de Imágenes CJ
      const mainImage = detail.bigImage || detail.productImageSet?.[0] || '';
      const finalVideoUrl = await serper.getPromotionalVideo(analysis.copywriting?.title_localized || localizedTitle, '');
      const extraImages = await serper.getLifestyleImages(analysis.copywriting?.title_localized || localizedTitle);
      const combinedImages = [...(detail.productImageSet || []).slice(0, 4), ...extraImages.slice(0, 2)];

      const rawLocalImages = await Promise.all(
        combinedImages.slice(0, 6).map((url, i) => media.downloadAndUploadImage(url, pid, i))
      );
      const cleanLocalImages = rawLocalImages.filter(img => img && img.trim() !== '');

      await client.query('BEGIN');

      let dbCategoryId = null; 
      const rawCatRes = detail.categoryName || 'General';
      
      // Limpiamos el breadcrumb de CJ (puede venir con '>' o '/')
      const separator = rawCatRes.includes('>') ? '>' : '/';
      const catParts = rawCatRes.split(separator).map((p: string) => p.trim());
      const finalCategoryName = catParts[catParts.length - 1] || 'General'; // Toma la subcategoría específica

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

      // ⚡ PROCESAMIENTO DE VARIANTES CJ (AJUSTADO SEGÚN DOCUMENTACIÓN OFICIAL DE CJ)
      const variantList = detail.variants || detail.variantList || [];

      for (const variant of variantList) {
        let colorName = null;
        let sizeName = null;
        
        // 1. Extraer Atributos: CJ usa 'variantKeyEn' (ej. "Black-XXL")
        const vKey = variant.variantKeyEn || variant.variantKey || '';
        if (vKey) {
          const parts = vKey.split('-');
          if (parts.length > 1) {
            colorName = parts[0].trim();
            sizeName = parts.slice(1).join('-').trim(); // Por si hay más guiones en la talla
          } else {
            colorName = parts[0].trim();
          }
        }

        // 2. Extraer Stock: 'variantInventories' viene como un String con formato JSON según doc
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
        } catch (e) {
          console.warn(`⚠️ [CJ Warn] No se pudo parsear el inventario para la variante: ${vKey}`);
        }

        // 3. Fallbacks de seguridad para IDs y Precios
        const variantId = variant.vid || variant.id;
        const variantPrice = variant.sellPrice || variant.variantSellPrice || detail.sellPrice;
        const variantImage = variant.variantImage || variant.image || mainImage;

        if (!variantId) continue; // Evitamos insertar variantes fantasma

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
          internalProductId, 
          variantId, 
          colorName, 
          sizeName, 
          stock, 
          variantPrice, 
          variantImage, 
          (stock > 0) // La variante solo estará activa si hay stock real en China
        ]);
      }

      await client.query('COMMIT');
      await redis.set(`global_proc:${pid}`, '1', 'EX', 86400);
      console.log(` ✅ [GANADOR] ${localizedTitle} guardado en BD con variantes CJ.`);
      
      // Se confirma el mensaje al final de un procesamiento exitoso
      message.ack();

    } catch (error: any) {
      if (client) await client.query('ROLLBACK');
      console.error(`❌ [ERROR CRÍTICO] PID ${pid}:`, error.message);
      
      // ⚡ FIX CRÍTICO 4: Aseguramos que el mensaje se descarte incluso si explota algo masivo, 
      // para no crear un bucle infinito de redeliveries en Pub/Sub.
      message.ack(); 
    } finally {
      // ⚡ FIX: Solo hacemos release si el client llegó a inicializarse
      if (client) {
        client.release(); 
      }
    }
  });
}