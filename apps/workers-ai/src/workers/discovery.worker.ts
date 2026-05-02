import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js'; 
import { AliExpressService } from '../aliexpress.service.js';
import { GeminiService } from '../gemini.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();
const aliService = new AliExpressService();
const gemini = new GeminiService();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FILTERS = { 
  MIN_PRICE: 1.5, 
  MAX_PRICE: 85.0, 
  MIN_RATING: 4.2, 
  MIN_SALES: 50,
  MAX_SHIPPING: 4.0 
};

// apps/workers-ai/src/workers/discovery.worker.ts

/**
 * Orquestador de Descubrimiento
 * @param manualNiche - Opcional: Nicho específico desde el Dashboard
 * @param manualCountry - Opcional: País específico desde el Dashboard
 */
export async function runDiscoveryTask(manualNiche?: string, manualCountry?: string) {
  const ahora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const isManual = manualNiche && manualCountry;
  
  console.log(`\n ${isManual ? '🎯 Análisis Dirigido' : '🌐 Discovery Global'} V1.1: ${ahora}`);

  try {
    // 1. Selección de Mercados
    // Si viene un país manual, filtramos la query; si no, traemos todos los activos.
    const marketsQuery = manualCountry 
      ? { text: `SELECT country_code, country_name FROM tax_rules WHERE country_code = $1 AND is_active = TRUE`, values: [manualCountry] }
      : { text: `SELECT country_code, country_name FROM tax_rules WHERE is_active = TRUE`, values: [] };

    const marketsRes = await pool.query(marketsQuery.text, marketsQuery.values);

    for (const market of marketsRes.rows) {
      const { country_code } = market;
      
      // 2. Selección de Nichos
      // Si viene un nicho manual, usamos ese; si no, le pedimos a Gemini que genere los dinámicos.
      const niches = manualNiche 
        ? [manualNiche] 
        : await gemini.generateDynamicNiches(country_code); 

      for (const niche of niches) {
        console.log(`🧐 Analizando nicho: "${niche}" en ${country_code}...`);
        
        // Registro en cache de nichos
        await pool.query(
          'INSERT INTO niche_cache (country_code, niche_text) VALUES ($1, $2) ON CONFLICT DO NOTHING', 
          [country_code, niche]
        );

        const items = await aliService.searchTrending(niche, country_code);
        
        let candidatesFound = 0;
        const LIMIT_CANDIDATES = isManual ? 20 : 10; // Si es manual, somos más generosos con los créditos

        for (const item of items) {
          if (candidatesFound >= LIMIT_CANDIDATES) {
            console.log(`🛑 Límite alcanzado para "${niche}". Pasando al siguiente.`);
            break; 
          }

          const { aliexpress_id, title, price, rating, sales, imageUrl } = item;
          const cacheKey = `proc:${country_code}:${aliexpress_id}`;

          // Evitar procesar lo mismo dos veces (Cache 7 días)
          if (await redis.get(cacheKey)) continue;

          // Filtros básicos de negocio
          if (price < FILTERS.MIN_PRICE || price > FILTERS.MAX_PRICE) continue;
          if (rating < FILTERS.MIN_RATING) continue;
          if (sales < FILTERS.MIN_SALES) continue;

          try {
            const detail = await aliService.getItemDetail(aliexpress_id);

            const finalPrice = Number(detail?.price) || Number(price) || 0;
            const finalShipping = Number(detail?.shippingFee) || 0;
            const finalTitle = detail?.title || title || "Producto sin nombre";

            if (finalShipping > FILTERS.MAX_SHIPPING) {
              console.log(`❌ Descartado ${aliexpress_id}: Envío caro ($${finalShipping}).`);
              continue; 
            }
            
            let videoUrl = detail?.videoUrl || null;
            if (!videoUrl && finalTitle !== "Producto sin nombre") {
              videoUrl = await aliService.findProductVideo(finalTitle);
            }

            if (detail && detail.stock < 10) continue;

            console.log(`✅ Candidato Aceptado: ${aliexpress_id}. Insertando...`);
            candidatesFound++;

            const insertQuery = `
              INSERT INTO products (
                aliexpress_id, title_original, image_url, video_url, target_country, 
                base_cost_usd, shipping_cost_usd, rating, sales_count, status, raw_details
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10)
              ON CONFLICT (aliexpress_id, target_country) 
              DO UPDATE SET 
                updated_at = NOW(), 
                sales_count = EXCLUDED.sales_count,
                raw_details = EXCLUDED.raw_details 
              RETURNING id;
            `;

            const res = await pool.query(insertQuery, [
              aliexpress_id, finalTitle, imageUrl, videoUrl, country_code,
              finalPrice, finalShipping, rating, sales, JSON.stringify(detail)
            ]);

            if (res.rows.length > 0) {
              // Notificar al AnalysisWorker para el juicio final de la IA (Arbitraje)
              await pubsub.topic('candidate-analysis-2').publishMessage({ 
                data: Buffer.from(JSON.stringify({ 
                  dbId: res.rows[0].id, 
                  itemId: aliexpress_id, 
                  targetCountry: country_code 
                })) 
              });
              
              await redis.set(cacheKey, '1', 'EX', 604800);
            }
          } catch (err: any) {
            console.error(`⚠️ Error detalle ID ${aliexpress_id}:`, err.message);
          }
          await sleep(600); // Throttling para no quemar la API de AliExpress
        }
      }
    }
  } catch (globalError: any) {
    console.error("🚨 Error Crítico Discovery:", globalError.message);
  }
}