import { Request, Response } from 'express';
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

// ⚡ ESCUDO GLOBAL: Función auxiliar para forzar Timeouts en cualquier Promesa
const withTimeout = (promise: Promise<any>, timeoutMs: number, operationName: string) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT_EXTERNAL: ${operationName} demoró más de ${timeoutMs}ms`)), timeoutMs))
  ]);
};

/**
 * Endpoint Push para Pub/Sub: Despierta automáticamente el contenedor de Cloud Run
 */
export const analyzeCandidatePush = async (req: Request, res: Response) => {
  // 1. Validar que la petición venga de Pub/Sub
  if (!req.body || !req.body.message || !req.body.message.data) {
    console.error('🚨 Petición descartada: No tiene el formato de Pub/Sub');
    return res.status(400).send('Bad Request');
  }

  let payload;
  try {
    // 2. Decodificar el mensaje Base64 enviado por Google
    const decodedData = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
    payload = JSON.parse(decodedData);
  } catch (error) {
    console.error('🚨 Error decodificando el mensaje:', error);
    // Respondemos 200 para que Pub/Sub descarte el mensaje mal formado y no lo reintente eternamente
    return res.status(200).send('Mensaje mal formado, descartado.');
  }

  if (!payload.aliexpress_id || !payload.batchId) {
    try {
      if (!payload.batchId || !payload.niche) throw new Error('Payload de discovery incompleto.');
      await runDiscoveryTask(payload.batchId, payload.niche, payload.targetCountry, payload.eliteLimit);
    } catch (err) {
      console.error('🚨 Error procesando el mensaje de discovery:', err);
      return res.status(500).send('Error procesando discovery; reintentar.');
    }
    return res.status(200).send('Discovery task procesada.');
  }

  console.log(`\n📡 [Push/Sub] Mensaje recibido para análisis profundo:`, payload);
  const { aliexpress_id: pid, batchId, targetCountry } = payload;
  const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG];
  if (!config) return res.status(400).send(`Mercado no soportado: ${targetCountry}`);
  const targetLang = config.language;
  
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
       // Respondemos 500 para emular el "message.nack()". Pub/Sub reintentará más tarde.
       return res.status(500).send('Error externo, reintentar.');
    }
    
    if (!detail || !detail.variants || detail.variants.length === 0) {
      console.log(` ❌ PID ${pid} descartado: Sin datos o variantes.`);
      return res.status(200).send('Descartado: Sin variantes.'); 
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
    
    // ⚡ CÁLCULO DINÁMICO DE ENVÍO Y TIEMPO DE TRÁNSITO
    let estimatedShipping = 5.00; 
    let estimatedTransitDays = 15; 

    try {
      const variantList = detail.variants || detail.variantList || [];
      const firstVid = variantList[0]?.vid || variantList[0]?.id;
      
      if (firstVid) {
        console.log(` 📦 Calculando flete dinámico a ${targetCountry} para VID: ${firstVid}...`);
        
        const shippingData = await withTimeout(
          cjService.getEstimatedFreight(String(firstVid), targetCountry), 
          15000, 
          'CJ_FreightCalculate'
        );
        
        if (shippingData.price > 0) {
          estimatedShipping = shippingData.price;
          estimatedTransitDays = shippingData.transitDays;
          console.log(` 🚚 Flete: $${estimatedShipping} USD | Tránsito máximo estimado: ${estimatedTransitDays} días`);
        }
      }
    } catch (shippingErr: any) {
      console.warn(`⚠️ [Logística Warn] Falló cálculo dinámico: ${shippingErr.message}`);
    }

    if (estimatedShipping > config.MAX_SHIPPING) {
      console.log(` ❌ PID ${pid} descartado: flete estimado excede el máximo de ${targetCountry}.`);
      return res.status(200).send('Descartado: Flete fuera del rango del mercado.');
    }

    const landedCostUsd = Number(detail.sellPrice) + estimatedShipping + config.LAST_MILE_BUFFER;
    const titleForScraping = scraper.cleanProductName(localizedTitle);
    
    console.log(` 🌐 Buscando competencia local para: "${titleForScraping}"...`);
    let marketResults = [];
    try {
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
      return res.status(200).send('Descartado: No es producto ganador.');
    }

    const mainImage = detail.bigImage || detail.productImageSet?.[0] || '';
    
    let finalVideoUrl = '';
    let extraImages: string[] = [];
    
    try {
      [finalVideoUrl, extraImages] = await Promise.all([
        withTimeout(serper.getPromotionalVideo(analysis.copywriting?.title_localized || localizedTitle, ''), 20000, 'Serper_Video'),
        withTimeout(serper.getLifestyleImages(analysis.copywriting?.title_localized || localizedTitle), 20000, 'Serper_Images')
      ]);
    } catch (mediaErr: any) {
       console.warn(`⚠️ [Media Warn] Fallo al obtener multimedia externa: ${mediaErr.message}. Usando solo recursos de CJ.`);
    }

    const combinedImages = [...(detail.productImageSet || []).slice(0, 4), ...(extraImages || []).slice(0, 2)];

    let localizedTechnicalHtml = '';
    if (detail.description) {
      console.log(` 🌐 Traduciendo HTML técnico para PID: ${pid}...`);
      try {
        localizedTechnicalHtml = await withTimeout(
          gemini.translateHTML(detail.description), 
          60000, 
          'Gemini_HTML_Translate'
        );
      } catch (htmlErr: any) {
        console.warn(`⚠️ Falló traducción de HTML, usando original: ${htmlErr.message}`);
        localizedTechnicalHtml = detail.description; 
      }
    }

    if (analysis && analysis.copywriting) {
      analysis.copywriting.technical_html_localized = localizedTechnicalHtml;
    }
    const marketingCopy = {
      ...analysis.copywriting,
      analysis: analysis.analysis,
      meta_targeting: analysis.meta_targeting
    };

    let rawLocalImages = [];
    try {
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'WINNER', $18, $19, $20, $21)
      ON CONFLICT (aliexpress_id, target_country) DO UPDATE SET 
        updated_at = NOW(), status = 'WINNER', raw_details = EXCLUDED.raw_details,
        marketing_copy = EXCLUDED.marketing_copy, ai_verdict = EXCLUDED.ai_verdict,
        suggested_price_local = EXCLUDED.suggested_price_local,
        suggested_price = EXCLUDED.suggested_price, roi_percent = EXCLUDED.roi_percent,
        net_margin_usd = EXCLUDED.net_margin_usd, base_cost_usd = EXCLUDED.base_cost_usd,
        shipping_cost_usd = EXCLUDED.shipping_cost_usd, vat_rate = EXCLUDED.vat_rate,
        rate_to_usd = EXCLUDED.rate_to_usd,
        video_url = EXCLUDED.video_url, local_images = EXCLUDED.local_images,
        estimated_transit_days = EXCLUDED.estimated_transit_days
      RETURNING id;
    `;

    const productRes = await client.query(insertQuery, [
      batchId, pid, detail.productNameEn, dbCategoryId, dbSupplierId, 
      mainImage, finalVideoUrl, JSON.stringify(cleanLocalImages), 
      detail.sellPrice, estimatedShipping, analysis.analysis.suggestedPriceLocal,
      (analysis.analysis.suggestedPriceLocal / parseFloat(rate_to_usd)),
      analysis.analysis.estimatedRoi, analysis.analysis.netMarginUsd,
      parseFloat(vat_rate), parseFloat(rate_to_usd), targetCountry,
      JSON.stringify(marketingCopy), analysis.analysis.reasoning, JSON.stringify(detail),
      estimatedTransitDays
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
    
    // Respondemos 200 para emular "message.ack()" y cerrar el ciclo
    return res.status(200).send('Análisis completado y guardado.');

  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error(`❌ [ERROR CRÍTICO] PID ${pid}:`, error.message);
    
    if (error.message.includes('TIMEOUT_EXTERNAL')) {
       // Equivalente a message.nack()
       return res.status(500).send('Timeout externo, forzando reintento en Pub/Sub.');
    } else {
       // Falla interna, descartamos para no atascar la cola
       return res.status(200).send('Fallo interno grave, mensaje descartado.');
    }
  } finally {
    if (client) {
      client.release(); 
    }
  }
};