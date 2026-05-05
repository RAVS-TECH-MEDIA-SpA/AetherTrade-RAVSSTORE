import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js'; 
import { AliExpressService } from '../aliexpress.service.js';
import { GeminiService } from '../gemini.service.js';
import { calculateSuggestedPrice } from '../lib/pricing.js';
import { MARKET_CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();
const aliService = new AliExpressService();
const gemini = new GeminiService();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- INTERFAZ DE DATOS ROBUSTA ---
interface AliExpressItem {
  aliexpress_id: string;
  title: string;
  imageUrl: string;
  price: number | string;
  rating: number | string;
  sales: number | string;
  sku?: {
    def?: {
      promotionPrice?: string;
      price?: string;
    };
  };
  averageStarRate?: string | number;
  delivery?: {
    shippingFee?: number | string;
    freeShipping?: boolean;
  };
}

/**
 * Procesa la tarea de descubrimiento de productos.
 * Soporta múltiples nichos manuales separados por ";" e integración con CFO Engine.
 */
export async function runDiscoveryTask(
  manualNiche?: string, 
  manualCountry?: string, 
  nicheLimit?: number, 
  eliteLimit?: number 
) {
  const ahora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const isManual = !!(manualNiche && manualCountry);
  
  const FINAL_NICHE_LIMIT = Number(nicheLimit) || (isManual ? 1 : 5);
  const FINAL_ELITE_LIMIT = Number(eliteLimit) || 10; 

  let requestCounter = 0;
  let globalWinnersFound = 0; 

  console.log(`\n🚀 [INICIO] runDiscoveryTask V3.4.4 | ${ahora}`);
  console.log(`📡 Parámetros -> Nicho: ${manualNiche || 'AUTO'}, País: ${manualCountry || 'TODOS'}`);
  console.log(`📊 Cuota Pro -> Nichos Máx: ${FINAL_NICHE_LIMIT} | Límite Global Ganadores: ${FINAL_ELITE_LIMIT}`);

  try {
    const recentNichesRes = await pool.query(
      'SELECT niche_text FROM niche_cache ORDER BY created_at DESC LIMIT 50'
    );
    const excludedNiches = recentNichesRes.rows.map(r => r.niche_text);

    const marketsQuery = manualCountry 
      ? { text: `SELECT country_code, country_name FROM tax_rules WHERE country_code = $1 AND is_active = TRUE`, values: [manualCountry] }
      : { text: `SELECT country_code, country_name FROM tax_rules WHERE is_active = TRUE`, values: [] };

    const marketsRes = await pool.query(marketsQuery.text, marketsQuery.values);

    for (const market of marketsRes.rows) {
      const { country_code } = market;
      const config = MARKET_CONFIG[country_code as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;

      console.log(`\n🏢 PROCESANDO MERCADO: [${country_code}]`);

      const niches = manualNiche 
        ? manualNiche.split(';').map(n => n.trim()).filter(n => n.length > 0).slice(0, FINAL_NICHE_LIMIT)
        : await gemini.generateDynamicNiches(country_code, FINAL_NICHE_LIMIT, excludedNiches); 
      
      console.log(`💡 Nichos a investigar: ${JSON.stringify(niches)}`);

      for (const niche of niches) {
        if (globalWinnersFound >= FINAL_ELITE_LIMIT) break;

        const cleanSearchQuery = niche.split(' ').slice(0, 4).join(' ');
        console.log(`\n 🧐 Analizando nicho: "${cleanSearchQuery}"`);
        
        await pool.query(
          'INSERT INTO niche_cache (country_code, niche_text) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
          [country_code, cleanSearchQuery]
        );

        const rawItems = await aliService.searchTrending(cleanSearchQuery, country_code);
        requestCounter++; 
        console.log(` 📦 Buffer: ${rawItems.length} productos brutos.`);

        // --- CORRECCIÓN DE PRE-FILTRO: Conversión Numérica Forzada ---
        const eliteCandidates = rawItems.filter((item: any) => {
          const product = item as AliExpressItem;
          
          // Forzamos conversión a número para evitar el error de comparación string | number
          const price = Number(product.sku?.def?.promotionPrice || product.sku?.def?.price || product.price);
          const rating = Number(product.averageStarRate || product.rating || 0);
          const shipping = Number(product.delivery?.shippingFee || 0);
          const sales = Number(product.sales || 0);

          return (
            price >= config.MIN_PRICE && price <= config.MAX_PRICE &&
            rating >= config.MIN_RATING &&
            sales >= config.MIN_SALES &&
            shipping <= config.MAX_SHIPPING
          );
        }).sort((a: any, b: any) => (Number(b.sales) || 0) - (Number(a.sales) || 0));

        console.log(` ✨ ${eliteCandidates.length} candidatos pasaron el pre-filtro.`);
        
        for (const item of eliteCandidates) {
          if (globalWinnersFound >= FINAL_ELITE_LIMIT) break; 

          if (requestCounter >= 95) {
            console.warn("⚠️ [LIMITER] Cerca del límite. Iniciando Cooldown...");
            await sleep(60000); 
            requestCounter = 0; 
          }

          const product = item as AliExpressItem;
          const { aliexpress_id, title, imageUrl } = product;
          
          // También aseguramos conversión aquí para el resto de la lógica
          const price = Number(product.sku?.def?.promotionPrice || product.sku?.def?.price || product.price);
          const rating = Number(product.averageStarRate || product.rating || 0);
          const sales = Number(product.sales || 0);

          const globalCacheKey = `global_proc:${aliexpress_id}`;
          const localCacheKey = `proc:${country_code}:${aliexpress_id}`;

          const [isGlobal, isLocal] = await Promise.all([
            redis.get(globalCacheKey),
            redis.get(localCacheKey)
          ]);

          if (isGlobal || isLocal) {
            console.log(` 🛡️ [SKIP] ID ${aliexpress_id} ya analizado.`);
            continue;
          }

          try {
            await sleep(1500); 

            console.log(` 💎 Detalle ID: ${aliexpress_id} | Req: ${requestCounter}/100...`);
            const detail = await aliService.getItemDetail(aliexpress_id);
            requestCounter++; 

            const finalPrice = Number(detail?.price) || price || 0;
            const finalShipping = Number(detail?.shippingFee) || 0;
            const finalTitle = detail?.title || title || "Producto sin nombre";

            if (finalShipping > config.MAX_SHIPPING) {
              console.log(` ❌ ID ${aliexpress_id} rechazado: Envío $${finalShipping} excedido.`);
              continue;
            }

            const suggestedPrice = calculateSuggestedPrice(finalPrice, finalShipping, country_code);
            const netMargin = suggestedPrice - (finalPrice + finalShipping);

            if (netMargin < config.SAFETY_MARGIN) {
              console.log(` ❌ ID ${aliexpress_id} rechazado: Margen $${netMargin.toFixed(2)} bajo.`);
              continue;
            }

            if (detail && detail.stock < 10) {
              console.log(` ❌ ID ${aliexpress_id} rechazado: Stock insuficiente (${detail.stock}).`);
              continue;
            }

            globalWinnersFound++;
            console.log(` ✅ GANADOR [${globalWinnersFound}/${FINAL_ELITE_LIMIT}]: ${finalTitle.substring(0, 30)}`);

            const insertQuery = `
              INSERT INTO products (
                aliexpress_id, title_original, image_url, video_url, target_country, 
                base_cost_usd, shipping_cost_usd, suggested_price, rating, sales_count, status, raw_details, source
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, $12)
              ON CONFLICT (aliexpress_id, target_country) 
              DO UPDATE SET 
                updated_at = NOW(), 
                sales_count = EXCLUDED.sales_count, 
                suggested_price = EXCLUDED.suggested_price,
                raw_details = EXCLUDED.raw_details 
              RETURNING id;
            `;

            const res = await pool.query(insertQuery, [
              aliexpress_id, finalTitle, imageUrl, detail?.videoUrl || null, country_code,
              finalPrice, finalShipping, suggestedPrice, rating, sales, JSON.stringify(detail), 'AliExpress'
            ]);

            if (res.rows.length > 0) {
              await pubsub.topic('candidate-analysis-2').publishMessage({ 
                data: Buffer.from(JSON.stringify({ dbId: res.rows[0].id, targetCountry: country_code })) 
              });
              
              await redis.set(globalCacheKey, '1', 'EX', 86400); 
              await redis.set(localCacheKey, '1', 'EX', 604800);
            }

          } catch (err: any) {
            console.error(` ⚠️ Error ID ${aliexpress_id}:`, err.message);
            if (err.message.toLowerCase().includes('quota')) return; 
          }
        }
      }
    }
  } catch (globalError: any) {
    console.error("\n🚨 [ERROR CRÍTICO]:", globalError.message);
  }
}

async function listenForDiscoveryTasks() {
  const subscription = pubsub.subscription('discovery-tasks-sub');
  console.log("📡 Discovery Worker listo. Escuchando órdenes en 'discovery-tasks-sub'...");

  subscription.on('message', async (message) => {
    try {
      const { niche, country, nicheLimit, eliteLimit } = JSON.parse(message.data.toString());
      console.log(`📥 [TAREA RECIBIDA] Iniciando Scouting para: ${niche || 'AUTO'}`);
      await runDiscoveryTask(niche, country, nicheLimit, eliteLimit);
      message.ack();
    } catch (error: any) {
      console.error("⚠️ Error procesando mensaje de descubrimiento:", error.message);
      message.ack(); 
    }
  });

  subscription.on('error', (err) => {
    console.error("🚨 Error en suscripción Pub/Sub (Discovery):", err);
  });
}

listenForDiscoveryTasks().catch(err => {
  console.error("🚨 Falló el inicio del Discovery Listener:", err);
  process.exit(1);
});