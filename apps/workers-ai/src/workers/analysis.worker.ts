import { PubSub } from '@google-cloud/pubsub';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { GeminiService } from '../gemini.service.js';
import { CompetitorService } from '../competitor.service.js';
import { ScraperService } from '../services/scraper.service.js';
import { MediaService } from '../services/media.services.js';
import { SerperService } from '../services/serper.service.js';
import { AliExpressService } from '../aliexpress.service.js';
import { MARKET_CONFIG } from '../config/constants.js';

const pubsub = new PubSub();
const aliService = new AliExpressService();
const gemini = new GeminiService();
const competitorService = new CompetitorService();
const scraper = new ScraperService();
const media = new MediaService();
const serper = new SerperService();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)));

export async function listenForCandidates() {
  const subscription = pubsub.subscription('candidate-analysis-sub-2', {
    flowControl: { maxMessages: 1 }
  });

  console.log("📡 [LISTENER] Analysis Worker V6.0 (Integrated Transactional Engine) | Cabrero listo.");

  subscription.on('message', async (message) => {
    const { aliexpress_id, batchId, targetCountry } = JSON.parse(message.data.toString());
    const targetLang = targetCountry === 'CL' ? 'Español' : 'Inglés';
    const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;

    const client = await pool.connect();

    try {
      console.log(`\n🔍 [ANALISIS PROFUNDO] ID: ${aliexpress_id} | Batch: ${batchId}`);

      // 1. Obtención de Data Profunda
      await sleep(5000); 
      const detail = await aliService.getItemDetail(aliexpress_id);
      
      if (!detail || detail.stock < 5) {
        console.log(` ❌ ID ${aliexpress_id} descartado: Stock insuficiente o no encontrado.`);
        message.ack();
        return; 
      }

      // 2. Reglas Fiscales
      const rulesRes = await client.query(`
        SELECT t.vat_rate, er.rate_to_usd, t.gateway_fee_percent
        FROM tax_rules t 
        JOIN exchange_rates er ON t.currency_code = er.currency_code
        WHERE t.country_code = $1 LIMIT 1`, [targetCountry]);
      
      if (rulesRes.rows.length === 0) throw new Error(`Reglas no encontradas para ${targetCountry}`);
      const { vat_rate, rate_to_usd } = rulesRes.rows[0];

      // 3. Preparación SEO y Scraper
      const localizedTitle = await gemini.translateForSearch(detail.title, targetLang);
      const landedCostUsd = Number(detail.price) + Number(detail.shippingFee) + config.LAST_MILE_BUFFER;
      const titleForScraping = scraper.cleanProductName(localizedTitle);
      
      console.log(` 🌐 Buscando competencia local para: "${titleForScraping}"...`);
      let marketResults = await scraper.getCompetitorPrices(titleForScraping, targetCountry);

      // 4. Lógica Océano Azul
      if (marketResults.length === 0) {
        const taxFactor = 1 + (Number(vat_rate) / 100);
        const baseCostWithTax = landedCostUsd * taxFactor;
        const targetMargin = Math.max(config.SAFETY_MARGIN * 2, 10.00); 
        const syntheticPriceLocal = (baseCostWithTax + targetMargin) * Number(rate_to_usd);

        marketResults.push({
          title: "Aether-Market-Engine (Strategic Target)",
          price: Math.round(syntheticPriceLocal),
          source: "Synthetic-Arbitrage",
          link: "https://aether.trade/ocean-azul",
          isSynthetic: true
        });
      }

      // 5. CFO Engine
      const analysis = await competitorService.runFullAnalysis(
        detail.title, targetCountry, parseFloat(vat_rate), 
        parseFloat(rate_to_usd), landedCostUsd, marketResults, localizedTitle 
      );

      if (!analysis.isWinner) {
        console.log(` ⏩ [RECHAZADO] ROI: ${analysis.analysis?.estimatedRoi}% | ${analysis.analysis?.reasoning}`);
        message.ack();
        return;
      }

      // 6. Multimedia
      let localImages: string[] = [];
      let finalVideoUrl = await serper.getPromotionalVideo(analysis.copywriting?.title_localized || localizedTitle, detail.videoUrl);
      
      const lifestyleSearch = analysis.copywriting?.title_localized || localizedTitle;
      const extraImages = await serper.getLifestyleImages(lifestyleSearch);
      const combinedImages = [...detail.images.slice(0, 4), ...extraImages.slice(0, 2)];

      localImages = await Promise.all(
        combinedImages.slice(0, 6).map((url, i) => media.downloadAndUploadImage(url, aliexpress_id, i))
      );

      // ==========================================================
      // 7. PERSISTENCIA TRANSACCIONAL (ATÓMICA)
      // ==========================================================
      await client.query('BEGIN');

      // --- 7.1 CATEGORÍA ---
      let dbCategoryId = null; 
      const rawCatId = detail.category_id;
      if (rawCatId !== 'UNCATEGORIZED') {
        const catRes = await client.query('SELECT id FROM categories WHERE ali_category_id = $1', [rawCatId]);
        if (catRes.rows.length > 0) {
          dbCategoryId = catRes.rows[0].id;
        } else {
          const newCat = await client.query(
            'INSERT INTO categories (ali_category_id, name, slug) VALUES ($1, $2, $3) RETURNING id', 
            [rawCatId, 'Categoría Nueva', `cat-${rawCatId}`]
          );
          dbCategoryId = newCat.rows[0].id;
        }
      }

      // --- 7.2 PROVEEDOR ---
      let dbSupplierId = null;
      const rawSuppId = detail.supplier_id;
      if (rawSuppId !== 'UNKNOWN_STORE') {
        const suppRes = await client.query('SELECT id FROM suppliers WHERE aliexpress_store_id = $1', [rawSuppId]);
        if (suppRes.rows.length > 0) {
          dbSupplierId = suppRes.rows[0].id;
        } else {
          const newSupp = await client.query(
            'INSERT INTO suppliers (aliexpress_store_id, store_name) VALUES ($1, $2) RETURNING id', 
            [rawSuppId, detail.store_name]
          );
          dbSupplierId = newSupp.rows[0].id;
        }
      }
      // --- PROCESAMIENTO DE ATRIBUTOS TÉCNICOS ---
      // Aquí podríamos mapear detail.properties a una tabla de atributos técnicos si es necesario.// --- 7.3 PROCESAMIENTO DE ATRIBUTOS TÉCNICOS ---
      const rawProperties = detail.properties || [];

      if (rawProperties.length > 0) {
          detail.properties = await gemini.translateAttributes(rawProperties, targetLang);
        }

      // --- 7.3 PRODUCTO ---
      const insertQuery = `
        INSERT INTO products (
          batch_id, aliexpress_id, title_original, category_id, supplier_id,
          image_url, video_url, local_images, base_cost_usd, shipping_cost_usd, 
          suggested_price_local, suggested_price, roi_percent, net_margin_usd, 
          vat_rate, rate_to_usd, target_country, status, marketing_copy, 
          ai_verdict, raw_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'WINNER', $18, $19, $20)
        ON CONFLICT (aliexpress_id, target_country) DO UPDATE SET 
          updated_at = NOW(),
          status = 'WINNER',
          raw_details = EXCLUDED.raw_details
        RETURNING id;
      `;

      const productRes = await client.query(insertQuery, [
        batchId, aliexpress_id, detail.title, dbCategoryId, dbSupplierId, 
        detail.imageUrl || detail.images[0], finalVideoUrl, JSON.stringify(localImages),
        detail.price, detail.shippingFee, 
        analysis.analysis.suggestedPriceLocal,
        (analysis.analysis.suggestedPriceLocal / parseFloat(rate_to_usd)),
        analysis.analysis.estimatedRoi, analysis.analysis.netMarginUsd,
        parseFloat(vat_rate), parseFloat(rate_to_usd), targetCountry,
        JSON.stringify(analysis.copywriting), 
        analysis.analysis.reasoning, 
        JSON.stringify(detail)
      ]);
      
      const internalProductId = productRes.rows[0].id;

      // ==========================================================
      // 8. PERSISTENCIA DE VARIANTES (MAPEO ROBUSTO SKUDATA)
      // ========================== ⚡ V6.0 ⚡ =====================
      const skuData = detail.sku; 

      if (skuData && skuData.props && skuData.base) {
        // Mapa de Propiedades (Pid:Vid -> Metadata Legible)
        const propsMap = new Map();
        skuData.props.forEach((prop: any) => {
          prop.values.forEach((val: any) => {
            propsMap.set(`${prop.pid}:${val.vid}`, { 
              name: prop.name, 
              value: val.name,
              image: val.image 
            });
          });
        });

        // Upsert de Combinaciones Reales
        // Upsert de Combinaciones Reales
        for (const variantBase of skuData.base) {
          // ⚡ FIX: Guardián contra el crash de 'split' en productos sin variantes
          const propPathRaw = variantBase.propMap || variantBase.propPath || "";
          const propPaths = propPathRaw ? propPathRaw.split(';') : [];
          
          let colorName = null;
          let sizeName = null;
          let variantImage = variantBase.image || null;

          // Solo iteramos si realmente hay propiedades (colores/tallas)
          propPaths.forEach((path: string) => {
            const info = propsMap.get(path);
            if (info) {
              // ID 14 = Color, ID 5 = Tamaño en Ali
              if (path.startsWith('14:') || info.name.toLowerCase().includes('color')) {
                colorName = info.value;
                if (!variantImage) variantImage = info.image; 
              } else {
                sizeName = info.value;
              }
            }
          });

          // Aseguramos que el precio nunca sea NaN
          const variantPriceUsd = parseFloat(variantBase.price || detail.price || '0');

          await client.query(`
            INSERT INTO product_variants (
              product_id, ali_sku_id, color, size, stock, additional_cost_usd, image_url, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (ali_sku_id) DO UPDATE SET 
              color = EXCLUDED.color, 
              size = EXCLUDED.size,
              stock = EXCLUDED.stock,
              additional_cost_usd = EXCLUDED.additional_cost_usd,
              updated_at = NOW()
          `, [
            internalProductId, 
            variantBase.skuId, 
            colorName, // Quedará NULL si no hay variantes, lo cual es correcto
            sizeName, 
            variantBase.quantity || 0, 
            variantPriceUsd, 
            variantImage || detail.imageUrl || detail.images[0],
            (Number(variantBase.quantity) > 0)
          ]);
        }
        console.log(` 📦 [VARIANTS] ${skuData.base.length} variantes integradas/actualizadas.`);
      }

      await client.query('COMMIT');
      await redis.set(`global_proc:${aliexpress_id}`, '1', 'EX', 86400);
      console.log(` ✅ [GANADOR] ${localizedTitle} (ROI: ${analysis.analysis.estimatedRoi}%)`);
      message.ack();

    } catch (error: any) {
      if (client) await client.query('ROLLBACK');
      console.error(`❌ [ERROR CRÍTICO] ID ${aliexpress_id}:`, error.message);
      message.ack(); 
    } finally {
      client.release(); 
    }
  });
}

listenForCandidates();