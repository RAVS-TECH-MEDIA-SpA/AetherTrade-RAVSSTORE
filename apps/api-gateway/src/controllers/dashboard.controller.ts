import { Request, Response } from 'express';
import { pool } from '../database.js';
import { PubSub } from '@google-cloud/pubsub';
// NOTA: Debes copiar estos archivos desde workers-ai a tu carpeta del gateway
import { GeminiService } from '../services/gemini.service.js'; 

import { findByAliExpressId } from '../products/products.service.js';
import { syncVariantsFromRaw } from '../products/product-sync.service.js';

export const pubsub = new PubSub({
  projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-local'
});
const gemini = new GeminiService();

const topicName = 'candidate-analysis-2';
const subscriptionName = 'candidate-analysis-sub-2';



async function initPubSub() {
  try {
    await pubsub.createTopic(topicName);
    console.log(`[PUBSUB] Tópico verificado/creado.`);
  } catch (err: any) {
    if (err.code !== 6) console.error(err); // 6 = ALREADY_EXISTS
  }

  try {
    await pubsub.topic(topicName).createSubscription(subscriptionName);
    console.log(`[PUBSUB] Suscripción verificada/creada.`);
  } catch (err: any) {
    if (err.code !== 6) console.error(err);
  }
}

/**
 * Obtiene KPIs, Gráficos y métricas de negocio actualizadas según el Glosario
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [salesResult, scoutingResult, countryResult, trendsResult, potentialResult] = await Promise.all([
      // 1. KPIs Financieros (Ventas Reales)
      pool.query(`
        SELECT 
          COALESCE(SUM(amount_usd), 0) as total_revenue,
          COALESCE(SUM(net_profit_usd), 0) as total_profit,
          COUNT(*) as total_sales
        FROM sales_performance
      `),
      // 2. KPIs de Scouting (Estado actual)
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'WINNER') as active_winners,
          COUNT(*) as total_scouted
        FROM products
      `),
      // 3. Distribución por País
      pool.query(`
        SELECT country_code as label, SUM(amount_usd) as value
        FROM sales_performance
        GROUP BY country_code
        ORDER BY value DESC
        LIMIT 5
      `),
      // 4. Tendencias
      pool.query(`
        SELECT 
          TO_CHAR(recorded_at, 'Mon') as month,
          AVG(winners_count)::integer as winners,
          AVG(avg_roi)::float as roi
        FROM niche_stats
        GROUP BY month, recorded_at
        ORDER BY recorded_at ASC
        LIMIT 6
      `),
      // 5. NUEVO: Métricas Proyectadas (Según Glosario)
      pool.query(`
        SELECT 
          COALESCE(SUM(net_margin_usd), 0) as potential_profit,
          COALESCE(AVG(roi_percent), 0) as avg_roi
        FROM products 
        WHERE status = 'WINNER'
      `)
    ]);

    const stats = salesResult.rows[0];
    const scouting = scoutingResult.rows[0];
    const potential = potentialResult.rows[0];

    // Estructura de KPIs sincronizada con el Dashboard
    const kpis = [
      { 
        title: 'Potential Net Profit', 
        value: `$${Number(potential.potential_profit).toLocaleString()}`, 
        trend: 15, 
        icon: 'payments' 
      },
      { 
        title: 'Market Winners', 
        value: scouting.active_winners.toString(), 
        trend: 5, 
        icon: 'military_tech' 
      },
      { 
        title: 'Items Scanned', 
        value: scouting.total_scouted.toString(), 
        trend: 0, 
        icon: 'database' 
      },
      { 
        title: 'Global Avg. ROI', 
        value: `${Number(potential.avg_roi).toFixed(1)}%`, 
        trend: 8, 
        icon: 'insights' 
      },
      { 
        title: 'Meta Ads Budget (Est.)', 
        value: `$${(Number(potential.potential_profit) * 0.2).toLocaleString()}`, 
        trend: 12, 
        icon: 'campaign' 
      }
    ];

    res.json({ 
      kpis, 
      countrySales: {
        labels: countryResult.rows.map((r: { label: any; }) => r.label || 'N/A'),
        datasets: [{
          data: countryResult.rows.map((r: { value: any; }) => r.value),
          backgroundColor: ['#3fb950', '#2188ff', '#f1e05a', '#f85149', '#8957e5']
        }]
      },
      trends: {
        labels: trendsResult.rows.map((r: { month: any; }) => r.month),
        datasets: [
          { label: 'Winners Found', data: trendsResult.rows.map((r: { winners: any; }) => r.winners), color: '#3fb950' },
          { label: 'Avg ROI %', data: trendsResult.rows.map((r: { roi: any; }) => r.roi), color: '#2188ff' }
        ]
      }
    });
  } catch (error) {
    console.error('🚨 Error en getDashboardStats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Inventario con JOINS para resolver el problema del VAT y rate_to_usd
 * UPDATE: Se agrega subquery JSON_AGG para incluir las variantes en el payload de la portada.
 */
export const getInventory = async (req: Request, res: Response) => {
  try {
    const { status, country } = req.query;
    
    // Mejorado con LEFT JOIN para traer reglas fiscales, de cambio Y las VARIANTES (JSON_AGG)
    let query = `
      SELECT 
        p.*, 
        t.vat_rate, 
        er.rate_to_usd,
        (
          SELECT JSON_AGG(v.* ORDER BY v.id ASC)
          FROM product_variants v 
          WHERE v.product_id = p.id
        ) as variants
      FROM products p
      LEFT JOIN tax_rules t ON p.target_country = t.country_code
      LEFT JOIN exchange_rates er ON t.currency_code = er.currency_code
      WHERE 1=1
    `;
    const params: (string | number | any)[] = [];

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (country) {
      params.push(country);
      query += ` AND p.target_country = $${params.length}`;
    }

    query += ` ORDER BY p.updated_at DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('🚨 Error en getInventory:', error);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
};



export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await findByAliExpressId(id as string);

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
        
    // Si el producto no tiene variantes procesadas, las sincronizamos al vuelo
    if (!product.variants || product.variants.length === 0) {
      await syncVariantsFromRaw(product.id, product.raw_details);
      // Volvemos a buscar para devolver la data actualizada
      const updatedProduct = await findByAliExpressId(id as string);
      return res.json(updatedProduct);
    }

    res.json(product);
  } catch (error: any) {
    console.error("Error en Gateway:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * UPDATE: El endpoint que soluciona el Error 404 al presionar "Update Master DB"
 */
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    status,
    suggested_price_local,
    suggested_price,
    net_margin_usd,
    roi_percent,
    marketing_copy,
    ai_verdict,
    local_images,
    video_url,
    name
  } = req.body;

  try {
    const query = `
      UPDATE products SET 
        status = $1, 
        suggested_price_local = $2, 
        suggested_price = $3,
        net_margin_usd = $4, 
        roi_percent = $5,
        marketing_copy = $6, 
        ai_verdict = $7, 
        local_images = $8, 
        video_url = $9,
        title_original = COALESCE($10, title_original),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *;
    `;

    const values = [
      status, 
      suggested_price_local, 
      suggested_price, 
      net_margin_usd, 
      roi_percent, 
      JSON.stringify(marketing_copy), 
      ai_verdict, 
      JSON.stringify(local_images), 
      video_url, 
      name,
      id
    ];

    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`🚨 Error actualizando producto ${id}:`, error);
    res.status(500).json({ error: 'Error interno al actualizar producto' });
  }
};

/**
 * Trigger al Worker AI con Solución de Bucle de Ráfaga y Generación Centralizada
 */
export const triggerAnalysis = async (req: Request, res: Response) => {
  await initPubSub(); // Asegura que el tópico y la suscripción existan antes de publicar
  const { niches, country, nicheLimit, eliteLimit } = req.body; 
  console.log(`🚀 [GATEWAY] Trigger recibido: Niches=${niches}, Country=${country}, NicheLimit=${nicheLimit}, EliteLimit=${eliteLimit}`);
  // const TOPIC_NAME = 'discovery-tasks';

  try {
    // 1. Preparación de variables de control
    const targetCountry = country || 'CL';
    const effectiveEliteLimit = Number(eliteLimit || 10);
    
    let finalNiches = String(niches || '')
      .split(';')
      .map(n => n.trim())
      .filter(n => n.length > 2);

    const effectiveNicheCount = finalNiches.length > 0 ? finalNiches.length : Number(nicheLimit || 5);
    const totalEstimatedCredits = effectiveNicheCount + (effectiveNicheCount * effectiveEliteLimit);

    // 2. Validación de Cuota (Blindaje Pro) - Sube el límite si tu RapidAPI lo permite
    if (totalEstimatedCredits > 300) {
      // return res.status(403).json({ 
      //   error: 'Configuración excede el límite de ráfaga Pro.',
      //   estimated: totalEstimatedCredits,
      //   limit: 300
      // });
      console.warn(`⚠️ [ALERTA DE CUOTA] El lote estima ${totalEstimatedCredits} créditos, lo cual es alto. Procediendo bajo riesgo del admin.`);
    }

    // --- [INTEGRACIÓN] GENERACIÓN CENTRALIZADA DE NICHOS ---
    if (finalNiches.length === 0) {
      console.log(`🤖 [GATEWAY] Solicitando ${effectiveNicheCount} nichos diversos a Gemini...`);
      
      // Obtenemos historial de caché para evitar repeticiones
      const recentRes = await pool.query('SELECT niche_text FROM niche_cache ORDER BY created_at DESC LIMIT 50');
      const excluded = recentRes.rows.map((r: { niche_text: any; }) => r.niche_text);

      // LLAMADA ÚNICA: Gemini genera el array completo de una vez
      finalNiches = await gemini.generateDynamicNiches(targetCountry, effectiveNicheCount, excluded);
      console.log(`✅ [GATEWAY] Nichos listos: ${finalNiches.join(', ')}`);
    }
    // -------------------------------------------------------

    // 3. REGISTRO DEL BATCH (Punto de control en DB)
    const batchRes = await pool.query(`
      INSERT INTO search_batches 
        (target_country, total_niches_requested, target_elite_count, status)
      VALUES ($1, $2, $3, 'DISCOVERING')
      RETURNING id;
    `, [targetCountry, effectiveNicheCount, effectiveEliteLimit]);

    const batchId = batchRes.rows[0].id;

    // 4. DESPACHO INDIVIDUAL DE TAREAS
    // Ahora enviamos el nicho ya definido desde el Gateway para evitar colisiones
    const dispatchPromises = finalNiches.map((nicheName) => {
      const messageData = {
        batchId: batchId,
        niche: nicheName, 
        country: targetCountry,
        eliteLimit: effectiveEliteLimit
      };

      const dataBuffer = Buffer.from(JSON.stringify(messageData));
      console.log(`📤 [GATEWAY] Enviando tarea de nicho: "${nicheName}" al Worker...`);
      console.log(`📤 [GATEWAY] Payload: ${JSON.stringify(messageData)}`);
      console.log(`📤 [GATEWAY] DataBuffer: ${dataBuffer.toString()}`);
      return pubsub.topic(topicName).publishMessage({ data: dataBuffer });
    });

    // 5. Confirmación de envío masivo
    const messageIds = await Promise.all(dispatchPromises);

    console.log(`🚀 [GATEWAY] Batch ${batchId} disparado con ${messageIds.length} nichos únicos.`);

    res.status(202).json({ 
      message: 'Análisis iniciado correctamente',
      batchId: batchId,
      tasksSent: messageIds.length,
      niches: finalNiches,
      telemetry: {
        total_estimated_credits: totalEstimatedCredits,
        niche_breadth: effectiveNicheCount,
        elite_depth_per_niche: effectiveEliteLimit
      }
    });

  } catch (error) {
    console.error('🚨 Error en triggerAnalysis:', error);
    res.status(502).json({ error: 'Fallo en la comunicación con el ecosistema Cloud.' });
  }
};