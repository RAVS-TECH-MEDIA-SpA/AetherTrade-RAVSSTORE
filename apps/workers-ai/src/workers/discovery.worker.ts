import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js'; 
import { CJDropshippingService } from '../services/cj.service.js'; // ⚡ CJ INYECTADO
import { MARKET_CONFIG } from '../config/constants.js';
import { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

export const pubsub = new PubSub({
  projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core'
});

const cjService = new CJDropshippingService();

// Constantes para Pub/Sub de Nichos
const TOPIC_NICHE = 'cj-niche-processing';
const SUB_NICHE = 'cj-niche-push-sub';

interface CJProductItem {
  pid?: string;
  id?: string;
  productId?: string;
  productNameEn: string;
  sellPrice: number;
}

// ============================================================================
// 🛠️ 1. INFRAESTRUCTURA: Auto-Creación de Tópico y Suscripción Pub/Sub
// ============================================================================
export async function setupPubSubInits() {
  try {
    const topic = pubsub.topic(TOPIC_NICHE);
    const [topicExists] = await topic.exists();
    
    if (!topicExists) {
      await topic.create();
      console.log(`✅ [Pub/Sub] Tópico creado: ${TOPIC_NICHE}`);
    }

    const subscription = topic.subscription(SUB_NICHE);
    const [subExists] = await subscription.exists();
    
    // La URL de tu Cloud Run debe estar configurada en las variables de entorno
    const serviceUrl = process.env.SERVICE_URL; 
    
    if (!subExists && serviceUrl) {
      await topic.createSubscription(SUB_NICHE, {
        pushConfig: { pushEndpoint: `${serviceUrl}/api/pubsub/process-niche` },
        ackDeadlineSeconds: 600 // 
      });
      console.log(`✅ [Pub/Sub] Suscripción Push creada hacia: ${serviceUrl}/api/pubsub/process-niche`);
    } else if (!subExists && !serviceUrl) {
      console.warn(`⚠️ [Pub/Sub] Tópico listo, pero falta la variable SERVICE_URL para crear la suscripción Push.`);
    }
  } catch (error) {
    console.error(`🚨 [Pub/Sub] Error inicializando colas:`, error);
  }
}

// ============================================================================
// 🎯 2. PRODUCTOR: Endpoint que recibe el Cron de Scheduler y encola los nichos
// ============================================================================
export const triggerDiscoveryBatch = async (req: Request, res: Response) => {
  console.log("⚙️ [Cron] Iniciando orquestación de Batch de Nichos...");

  try {
    await setupPubSubInits();

    // AQUÍ DEBES OBTENER TUS NICHOS (Ya sea llamando a Gemini o desde req.body)
    // Asumimos que los recibes en req.body.niches o generas tu array aquí
    const nichosGenerados = req.body.niches || ["usb cup warmer", "keyboard wrist rest", "ergonomic mouse pad"]; // Array de ejemplo/fallback
    
    if (!nichosGenerados || nichosGenerados.length === 0) {
       return res.status(400).json({ error: "No se proporcionaron nichos para procesar." });
    }

    const batchId = `batch-${Date.now()}`;
    const targetCountry = req.body.country || 'CL';
    const eliteLimit = req.body.eliteLimit || 50;

    // Registramos el batch en la BD para llevar la cuenta
    await pool.query(`
      INSERT INTO search_batches (id, status, total_niches_requested, completed_niches) 
      VALUES ($1, 'DISCOVERING', $2, 0)
    `, [batchId, nichosGenerados.length]);

    // Encolamos cada nicho de forma independiente
    for (const niche of nichosGenerados) {
      const payload = JSON.stringify({ batchId, niche, country: targetCountry, eliteLimit });
      await pubsub.topic(TOPIC_NICHE).publishMessage({ data: Buffer.from(payload) });
      console.log(`📤 [PRODUCER] Nicho encolado en Pub/Sub: "${niche}"`);
    }

    // Respuesta inmediata a Cloud Scheduler (Evita timeouts)
    res.status(200).json({ 
      message: `Batch ${batchId} iniciado. ${nichosGenerados.length} nichos enviados a la cola.` 
    });

  } catch (error) {
    console.error("🚨 Error disparando batch:", error);
    res.status(500).json({ error: "Fallo interno en orquestación de nichos" });
  }
};

// ============================================================================
// 🤖 3. CONSUMIDOR: Endpoint que recibe 1 Nicho de Pub/Sub y lo procesa
// ============================================================================
export const processPubSubNiche = async (req: Request, res: Response) => {
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(400).send('Bad Request: No hay payload de Pub/Sub');
    }

    // Decodificar el mensaje
    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    const { batchId, niche, country, eliteLimit } = JSON.parse(decodedData);

    console.log(`📥 [CONSUMER] Desencolando e iniciando procesamiento para: "${niche}" (Batch: ${batchId})`);

    // Llamamos a tu lógica pesada original de un solo nicho
    await runDiscoveryTask(batchId, niche, country, eliteLimit);

    // Responder 200 OK para que Pub/Sub marque el mensaje como completado
    res.status(200).send('Nicho procesado con éxito');

  } catch (error) {
    console.error(`🚨 [CONSUMER ERROR] Falló el nicho:`, error);
    // Devolver un error hace que Pub/Sub reintente este nicho más tarde
    res.status(500).send('Error procesando el nicho, reintentar.');
  }
};

// ============================================================================
// ⚙️ 4. LÓGICA DE NEGOCIO ORIGINAL (Modificada con Escudos para Redis y CJ)
// ============================================================================
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

  // ⚡ 1. Desfase aleatorio AMPLIO: Repartimos la carga en una ventana de 60 segundos
    // Esto evita que Cloud Run ametralle a CJ Dropshipping en el mismo milisegundo
    const randomDelay = Math.floor(Math.random() * 60000) + 2000;
    console.log(`⏳ Esperando ${(randomDelay/1000).toFixed(1)}s antes de consultar CJ...`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));

    // ⚡ 2. Buscar en CJ Dropshipping
    const rawItems = await cjService.searchProducts(cleanSearchQuery);

    // ⚡ 3. Control estricto de Rate Limit (QPS)
    if (rawItems && (rawItems as any).code === 1600200) {
      console.warn(`⏳ [RATE LIMIT] CJ saturado (1 req/sec) para "${cleanSearchQuery}". Pub/Sub reintentará en breve...`);
      throw new Error("CJ_RATE_LIMIT"); 
    }

    // ⚡ 4. Validación de respuesta vacía o error genérico
    if (!Array.isArray(rawItems)) {
      console.warn(`⚠️ [CJ API] Respuesta no válida o vacía para "${cleanSearchQuery}". Saltando...`);
      return; 
    }

    console.log(`📦 Buffer: ${rawItems.length} productos brutos encontrados en CJ para "${cleanSearchQuery}".`);
    
    const poolCandidates = [];
    let redisFails = 0; // ⚡ Contador para no saturar los logs si Redis está caído

    for (const item of rawItems) {
      const product = item as CJProductItem;
      
      const pid = product.pid || product.id || product.productId;
      if (!pid) continue; 

      const price = Number(product.sellPrice || 0);
      const globalCacheKey = `global_proc:${pid}`;
      
      let isAnalyzed = null;
      
      // ⚡ Límite de tiempo estricto para Redis (2 segundos)
      try {
        if (redisFails < 3) {
          isAnalyzed = await Promise.race([
            redis.get(globalCacheKey),
            new Promise((_, reject) => setTimeout(() => reject(new Error('REDIS_TIMEOUT')), 2000))
          ]);
        }
      } catch (redisError: any) {
        redisFails++;
        if (redisFails === 1) {
          console.warn(`⚠️ [REDIS ALERTA] Fallo al consultar PID ${pid}: ${redisError.message}. Saltando caché para este nicho...`);
        }
        isAnalyzed = null; 
      }

      if (isAnalyzed) continue;

      if (price >= config.MIN_PRICE && price <= config.MAX_PRICE) {
        const discoveryScore = 100 / (price > 0 ? price : 1);

        poolCandidates.push({
          batchId,
          nicheId,
          aliexpress_id: pid, 
          title: product.productNameEn || 'Unknown Product',
          price,
          sales: 100, 
          rating: 4.8, 
          score: discoveryScore
        });
      }
    }

    console.log(`✨ ${poolCandidates.length} candidatos pasaron el pre-filtro de CJ y Redis.`);

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
    // ⚡ VITAL: Relanzamos el error si es de Rate Limit para que el Endpoint lo atrape y Pub/Sub lo devuelva a la cola
    if (error.message === "CJ_RATE_LIMIT") throw error;
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

export const processCJBatch = async (req: Request, res: Response) => {
  console.log("⚙️ [Cron] Iniciando lote B2C hacia CJ Dropshipping...");

  try {
    const { rows: orders } = await pool.query(`
      SELECT o.id as order_id, o.total_amount_local, o.total_amount_usd,
             c.email, c.first_name, c.last_name, c.phone, c.document_id,
             a.street, a.number, a.city, a.state_province, a.postal_code, a.country_code, a.details
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_addresses a ON o.address_id = a.id
      WHERE o.status = 'PAID_READY' 
      LIMIT 50
    `);

    if (orders.length === 0) {
      return res.status(200).json({ message: "Sin órdenes pendientes." });
    }

    for (const order of orders) {
      // ⚡ FIX: Hacemos JOIN con products y product_variants para rescatar costos y tasas de cambio reales
      const { rows: items } = await pool.query(`
        SELECT i.quantity, i.unit_cost_usd, v.ali_sku_id as cj_variant_id,
               p.base_cost_usd, v.additional_cost_usd, p.shipping_cost_usd, p.rate_to_usd
        FROM order_items i
        JOIN product_variants v ON i.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE i.order_id = $1
      `, [order.order_id]);

      let totalCostUsd = 0;
      let rateToUsd = 1;

      items.forEach(item => { 
        // ⚡ INTELIGENCIA: Si el checkout envió "0.00", calculamos el costo real en USD al vuelo
        const actualUnitCost = Number(item.unit_cost_usd) > 0 
            ? Number(item.unit_cost_usd) 
            : Number(item.base_cost_usd) + Number(item.additional_cost_usd) + Number(item.shipping_cost_usd);
        
        totalCostUsd += (actualUnitCost * item.quantity); 
        rateToUsd = Number(item.rate_to_usd) || 1;
      });

      // ⚡ INTELIGENCIA: Convertimos la venta a USD si viene en "0.00"
      const realTotalAmountUsd = Number(order.total_amount_usd) > 0 
          ? Number(order.total_amount_usd) 
          : Number(order.total_amount_local) / rateToUsd;

      const marginUsd = realTotalAmountUsd - totalCostUsd;

      console.log(`📊 [Orden ${order.order_id}] Venta: $${realTotalAmountUsd.toFixed(2)} USD | Costo CJ: $${totalCostUsd.toFixed(2)} USD | Margen: $${marginUsd.toFixed(2)} USD`);

      if (marginUsd <= 0) {
        console.warn(`⚠️ [ALERTA] Orden ${order.order_id} sin margen. Marcando para revisión manual.`);
        await pool.query(`UPDATE orders SET status = 'MANUAL_REVIEW_PROFIT' WHERE id = $1`, [order.order_id]);
        continue; 
      }

      // 🔍 DEBUG: Visibilidad total antes de golpear la API de CJ
      console.log(`📦 [DEBUG PAYLOAD A CJ] Datos estructurados para la orden ${order.order_id}:`, JSON.stringify({ order, items }, null, 2));

      // ⚡ Bloque de contención para que fallos de CJ no detengan el Cron
      try {
        const cjResponse = await cjService.createOrder(order, items);

        if (cjResponse && (cjResponse.code === 200 || cjResponse.result === true)) {
          const cjOrderId = cjResponse.data || 'CJ-PENDING'; 
          
          await pool.query(`
            UPDATE orders 
            SET status = 'PROCESSING_SUPPLIER', ali_order_id = $1 
            WHERE id = $2
          `, [cjOrderId, order.order_id]);
          
          console.log(`✅ [CJ Éxito] Orden ${order.order_id} inyectada. CJ ID: ${cjOrderId}`);
        } else {
          console.error(`❌ [CJ Res] Error en lógica de negocio:`, cjResponse?.message);
          
          const msg = (cjResponse?.message || '').toLowerCase();
          const isBalanceIssue = msg.includes('balance') || msg.includes('wallet') || msg.includes('insufficient') || msg.includes('pay');
          const newStatus = isBalanceIssue ? 'SUPPLIER_PAYMENT_REQUIRED' : 'API_ERROR_RETRY';

          await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [newStatus, order.order_id]);
        }
      } catch (cjError: any) {
        const errorData = cjError.response?.data || {};
        const errorMessage = errorData.message || cjError.message || '';
        
        console.error(`🚨 [CJ Exception] Fallo al inyectar orden ${order.order_id}:`, errorMessage);

        const msg = errorMessage.toLowerCase();
        const isBalanceIssue = msg.includes('balance') || msg.includes('wallet') || msg.includes('insufficient') || msg.includes('pay');
        const newStatus = isBalanceIssue ? 'SUPPLIER_PAYMENT_REQUIRED' : 'API_ERROR_RETRY';

        await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [newStatus, order.order_id]);
      }
    }

    res.status(200).json({ message: `Lote completado. ${orders.length} procesadas.` });

  } catch (error: any) {
    console.error("🚨 Error ejecutando lote CJ:", error);
    res.status(500).json({ error: "Fallo interno en Cron Job" });
  }
};