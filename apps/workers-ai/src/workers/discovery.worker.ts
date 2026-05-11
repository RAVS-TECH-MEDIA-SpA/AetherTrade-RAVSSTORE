// apps/workers-ai/src/workers/discovery.worker.ts
import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js'; 
import { AliExpressService } from '../aliexpress.service.js';
import { MARKET_CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();
const aliService = new AliExpressService();

// Nota: GeminiService ya no es necesario aquí, la lógica de "cerebro" reside en el Gateway.

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
 * FASE 1: COSECHA GLOBAL (Harvest)
 * Recibe un nicho ya definido por el Gateway y procesa los candidatos.
 */
export async function runDiscoveryTask(
  batchId: string,
  niche: string, 
  manualCountry?: string, 
  eliteLimit?: number 
) {
  const ahora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const targetCountry = manualCountry || 'CL';
  const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;

  console.log(`\n🚜 [COSECHA BATCH: ${batchId}] | ${ahora}`);
  console.log(`📡 Nicho Recibido: "${niche}" | Mercado: ${targetCountry}`);

  try {
    // 1. Registro y Limpieza del Nicho
    // Tomamos las primeras 4 palabras para mantener el SEO limpio en la base de datos
    const cleanSearchQuery = niche.split(' ').slice(0, 4).join(' ');
    
    const nicheRes = await pool.query(
      `INSERT INTO niche_cache (country_code, niche_text) 
       VALUES ($1, $2) 
       ON CONFLICT (country_code, niche_text) 
       DO UPDATE SET created_at = NOW() 
       RETURNING id`, 
      [targetCountry, cleanSearchQuery]
    );
    const nicheId = nicheRes.rows[0].id;

    // 2. Scraper Inicial (Búsqueda en AliExpress Business)
    const rawItems = await aliService.searchTrending(cleanSearchQuery, targetCountry);
    console.log(` 📦 Buffer: ${rawItems.length} productos brutos encontrados para "${cleanSearchQuery}".`);

    // 3. Pre-Filtro y Scoring (Arbitraje de Entrada)
    const poolCandidates = [];
    for (const item of rawItems) {
      const product = item as AliExpressItem;
      
      const price = Number(product.sku?.def?.promotionPrice || product.sku?.def?.price || product.price || 0);
      const rating = Number(product.averageStarRate || product.rating || 0);
      const shipping = Number(product.delivery?.shippingFee || 0);
      const sales = Number(product.sales || 0);

      // Verificación de Redis: Si ya está en análisis profundo, no lo volvemos a meter al pool
      const globalCacheKey = `global_proc:${product.aliexpress_id}`;
      const isAnalyzed = await redis.get(globalCacheKey);
      
      if (isAnalyzed) {
        continue;
      }

      // Filtros de Configuración (MARKET_CONFIG)
      if (
        price >= config.MIN_PRICE && price <= config.MAX_PRICE &&
        rating >= config.MIN_RATING &&
        sales >= config.MIN_SALES &&
        shipping <= config.MAX_SHIPPING
      ) {
        // Scoring de descubrimiento: Priorizamos ventas y rating sobre precio
        const discoveryScore = (sales * rating) / (price > 0 ? price : 1);

        poolCandidates.push({
          batchId,
          nicheId,
          aliexpress_id: product.aliexpress_id,
          title: product.title,
          price,
          sales,
          rating,
          score: discoveryScore
        });
      }
    }

    console.log(` ✨ ${poolCandidates.length} candidatos pasaron el pre-filtro.`);

    // 4. Inserción masiva en Discovery Pool
    if (poolCandidates.length > 0) {
      for (const cand of poolCandidates) {
        await pool.query(`
          INSERT INTO discovery_pool 
            (batch_id, niche_id, aliexpress_id, title_raw, price_est_usd, sales_est, rating_est, discovery_score)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING`, 
          [cand.batchId, cand.nicheId, cand.aliexpress_id, cand.title, cand.price, cand.sales, cand.rating, cand.score]
        );
      }
    }

    // 5. Orquestación: Actualizar progreso del Batch
    const batchUpdate = await pool.query(`
      UPDATE search_batches 
      SET completed_niches = completed_niches + 1, updated_at = NOW() 
      WHERE id = $1 RETURNING completed_niches, total_niches_requested`, 
      [batchId]
    );

    const { completed_niches, total_niches_requested } = batchUpdate.rows[0];
    console.log(`📈 [PROGRESS] Batch ${batchId}: ${completed_niches}/${total_niches_requested} nichos completados.`);

    // 6. Disparar Ranking Global (Solo si es la última tarea del lote)
    if (completed_niches >= total_niches_requested) {
      console.log(`🎯 [LOTE FINALIZADO] Iniciando selección de élite...`);
      await triggerGlobalRanking(batchId, targetCountry, eliteLimit || 50);
    }

  } catch (error: any) {
    console.error(`🚨 [ERROR DISCOVERY] Batch ${batchId}:`, error.message);
  }
}

/**
 * FASE 2: RANKING GLOBAL (Diversity Engine)
 * Selecciona los mejores productos de cada nicho para el análisis profundo.
 */
async function triggerGlobalRanking(batchId: string, country: string, eliteLimit: number) {
  try {
    await pool.query(`UPDATE search_batches SET status = 'RANKING' WHERE id = $1`, [batchId]);

    // Usamos PARTITION BY para asegurar diversidad (que no todos los ganadores sean de un solo nicho)
    const eliteRes = await pool.query(`
      WITH RankedItems AS (
        SELECT aliexpress_id,
               ROW_NUMBER() OVER(PARTITION BY niche_id ORDER BY discovery_score DESC) as rank_in_niche
        FROM discovery_pool
        WHERE batch_id = $1
      )
      SELECT aliexpress_id FROM RankedItems 
      WHERE rank_in_niche <= 10 
      ORDER BY rank_in_niche ASC 
      LIMIT $2`, 
      [batchId, eliteLimit]
    );

    console.log(`🚀 [ANALYSIS] Enviando ${eliteRes.rows.length} finalistas al Analysis Worker...`);

    for (const row of eliteRes.rows) {
      await pubsub.topic('candidate-analysis-2').publishMessage({ 
        data: Buffer.from(JSON.stringify({ 
          aliexpress_id: row.aliexpress_id, 
          batchId: batchId,
          targetCountry: country 
        })) 
      });
    }

    await pool.query(`UPDATE search_batches SET status = 'ARBITRATING' WHERE id = $1`, [batchId]);

  } catch (error) {
    console.error("🚨 [RANKING ERROR]:", error);
  }
}

/**
 * LISTENER DE TAREAS
 */
async function listenForDiscoveryTasks() {
  const subscription = pubsub.subscription('discovery-tasks-sub');
  console.log("📡 Discovery Worker V4.7 (Pure Execution) | Escuchando...");

  subscription.on('message', async (message) => {
    try {
      const rawData = JSON.parse(message.data.toString());
      const bId = rawData.batchId || rawData.batch_id; 

      if (!bId || !rawData.niche) {
        console.warn("⚠️ Mensaje ignorado: Falta BatchID o Nicho.");
        return message.ack(); 
      }

      await runDiscoveryTask(bId, rawData.niche, rawData.country, rawData.eliteLimit);
      message.ack();
    } catch (err) {
      console.error("🚨 Error procesando mensaje:", err);
      message.ack();
    }
  });
}

listenForDiscoveryTasks();