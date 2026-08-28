import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js'; 
import { CJDropshippingService } from '../services/cj.service.js'; // ⚡ CJ INYECTADO
import { MARKET_CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

export const pubsub = new PubSub({
  projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-local'
});
const cjService = new CJDropshippingService();

interface CJProductItem {
  pid?: string;
  id?: string;
  productId?: string;
  productNameEn: string;
  sellPrice: number;
}

export async function runDiscoveryTask(
  batchId: string,
  niche: string, 
  manualCountry?: string, 
  eliteLimit?: number 
) {
  const ahora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  const targetCountry = manualCountry || 'CL';
  const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;

  console.log(`\n🚜 [COSECHA CJ BATCH: ${batchId}] | ${ahora}`);
  console.log(`📡 Nicho Recibido: "${niche}" | Mercado: ${targetCountry}`);

  try {
    const cleanSearchQuery = niche.split(' ').slice(0, 4).join(' ');
    
    const nicheRes = await pool.query(
      `INSERT INTO niche_cache (country_code, niche_text) 
       VALUES ($1, $2) ON CONFLICT (country_code, niche_text) 
       DO UPDATE SET created_at = NOW() RETURNING id`, 
      [targetCountry, cleanSearchQuery]
    );
    const nicheId = nicheRes.rows[0].id;

    // ⚡ Buscar en CJ Dropshipping
    const rawItems = await cjService.searchProducts(cleanSearchQuery);
    console.log(`📦 Buffer: ${rawItems.length} productos brutos encontrados en CJ para "${cleanSearchQuery}".`);

    const poolCandidates = [];
    for (const item of rawItems) {
      const product = item as CJProductItem;
      
      // ⚡ SOLUCIÓN: Extracción robusta del PID para garantizar unicidad y evitar duplicados
      const pid = product.pid || product.id || product.productId;
      if (!pid) {
        continue; // Si el producto no trae un identificador válido de CJ, lo omitimos
      }

      const price = Number(product.sellPrice || 0);

      const globalCacheKey = `global_proc:${pid}`;
      const isAnalyzed = await redis.get(globalCacheKey);
      if (isAnalyzed) continue;

      if (price >= config.MIN_PRICE && price <= config.MAX_PRICE) {
        // Scoring adaptado a CJ: Favorecemos precios intermedios (mejores márgenes)
        const discoveryScore = 100 / (price > 0 ? price : 1);

        poolCandidates.push({
          batchId,
          nicheId,
          aliexpress_id: pid, // Guardamos el PID real y único en la columna actual
          title: product.productNameEn || 'Unknown Product',
          price,
          sales: 100, // Dummy para mantener compatibilidad con tu BD
          rating: 4.8, // Dummy
          score: discoveryScore
        });
      }
    }

    console.log(`✨ ${poolCandidates.length} candidatos pasaron el pre-filtro de CJ.`);

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

    const batchUpdate = await pool.query(`
      UPDATE search_batches 
      SET completed_niches = completed_niches + 1, updated_at = NOW() 
      WHERE id = $1 RETURNING completed_niches, total_niches_requested`, 
      [batchId]
    );

    const { completed_niches, total_niches_requested } = batchUpdate.rows[0];
    console.log(`📈 [PROGRESS] Batch ${batchId}: ${completed_niches}/${total_niches_requested} nichos completados.`);

    if (completed_niches >= total_niches_requested) {
      console.log(`🎯 [LOTE FINALIZADO] Iniciando selección de élite...`);
      await triggerGlobalRanking(batchId, targetCountry, eliteLimit || 50);
    }
  } catch (error: any) {
    console.error(`🚨 [ERROR DISCOVERY] Batch ${batchId}:`, error.message);
  }
}

async function triggerGlobalRanking(batchId: string, country: string, eliteLimit: number) {
  try {
    await pool.query(`UPDATE search_batches SET status = 'RANKING' WHERE id = $1`, [batchId]);
    const eliteRes = await pool.query(`
      WITH RankedItems AS (
        SELECT aliexpress_id, ROW_NUMBER() OVER(PARTITION BY niche_id ORDER BY discovery_score DESC) as rank_in_niche
        FROM discovery_pool WHERE batch_id = $1
      )
      SELECT aliexpress_id FROM RankedItems WHERE rank_in_niche <= 10 ORDER BY rank_in_niche ASC LIMIT $2`, 
      [batchId, eliteLimit]
    );

    console.log(`🚀 [ANALYSIS] Enviando ${eliteRes.rows.length} finalistas al Analysis Worker...`);
    for (const row of eliteRes.rows) {
      await pubsub.topic('candidate-analysis-2').publishMessage({ 
        data: Buffer.from(JSON.stringify({ 
          aliexpress_id: row.aliexpress_id, // Este es el PID único
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