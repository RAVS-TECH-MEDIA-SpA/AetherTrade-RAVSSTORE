import { Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../database';
import { PubSub } from '@google-cloud/pubsub'; // Asegúrate de instalarlo en el gateway

const pubsub = new PubSub();
/**
 * Obtiene KPIs, Gráfico de Países y Gráfico de Tendencias
 */
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Consultas paralelas para máxima velocidad
    const [salesResult, scoutingResult, countryResult, trendsResult] = await Promise.all([
      // 1. KPIs Financieros
      pool.query(`
        SELECT 
          COALESCE(SUM(amount_usd), 0) as total_revenue,
          COALESCE(SUM(net_profit_usd), 0) as total_profit,
          COUNT(*) as total_sales
        FROM sales_performance
      `),
      // 2. KPIs de Scouting
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'Winner') as active_winners,
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
      // 4. Tendencias (de niche_stats)
      pool.query(`
        SELECT 
          TO_CHAR(recorded_at, 'Mon') as month,
          AVG(winners_count)::integer as winners,
          AVG(avg_roi)::float as roi
        FROM niche_stats
        GROUP BY month, recorded_at
        ORDER BY recorded_at ASC
        LIMIT 6
      `)
    ]);

    const stats = salesResult.rows[0];
    const scouting = scoutingResult.rows[0];

    // Estructura de KPIs para los widgets superiores
    const kpis = [
      { 
        title: 'Total Revenue', 
        value: `$${Number(stats.total_revenue).toLocaleString()}`, 
        trend: 0, 
        icon: 'payments' 
      },
      { 
        title: 'Net Profit', 
        value: `$${Number(stats.total_profit).toLocaleString()}`, 
        trend: 0, 
        icon: 'trending_up' 
      },
      { 
        title: 'Active Winners', 
        value: scouting.active_winners.toString(), 
        trend: 0, 
        icon: 'star' 
      },
      { 
        title: 'Products Scouted', 
        value: scouting.total_scouted.toString(), 
        trend: 0, 
        icon: 'search' 
      }
    ];

    res.json({ 
      kpis, 
      countrySales: {
        labels: countryResult.rows.map(r => r.label || 'N/A'),
        datasets: [{
          data: countryResult.rows.map(r => r.value),
          backgroundColor: ['#3fb950', '#2188ff', '#f1e05a', '#f85149', '#8957e5']
        }]
      },
      trends: {
        labels: trendsResult.rows.map(r => r.month),
        datasets: [
          { label: 'Winners Found', data: trendsResult.rows.map(r => r.winners), color: '#3fb950' },
          { label: 'Avg ROI %', data: trendsResult.rows.map(r => r.roi), color: '#2188ff' }
        ]
      }
    });
  } catch (error) {
    console.error('🚨 Error en getDashboardStats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Inventario con mapeo de columnas reales (title_original, roi_percent, etc.)
 */
export const getInventory = async (req: Request, res: Response) => {
  try {
    const { status, country } = req.query;
    
    let query = `SELECT * FROM products WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (country) {
      params.push(country);
      query += ` AND target_country = $${params.length}`;
    }

    query += ` ORDER BY updated_at DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    
    // IMPORTANTE: Aquí devolvemos la fila tal cual está en la DB
    // para que la landing tenga acceso a marketing_copy, local_images, etc.
    res.json(result.rows);
  } catch (error: any) {
    console.error('🚨 Error en getInventory:', error);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
};

/**
 * Obtiene el detalle completo de un producto por su ID (UUID)
 * Solución al Error 405 y fuente de datos para el Modal de la Landing
 */
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE id = $1 LIMIT 1`, 
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Retornamos la fila completa, incluyendo el JSONB marketing_copy
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`🚨 Error en getProductById (${id}):`, error);
    res.status(500).json({ error: 'Error al obtener el detalle del producto' });
  }
};

/**
 * Trigger al Worker AI con soporte para múltiples nichos y límite de sugerencias
 */

export const triggerAnalysis = async (req: Request, res: Response) => {
  const { niches, country, nicheLimit, eliteLimit } = req.body; 
  const TOPIC_NAME = 'discovery-tasks'; // El tópico que creamos en gcloud

  try {
    // 1. Procesamos la lista manual
    const nicheList = String(niches || '')
      .split(';')
      .map(n => n.trim())
      .filter(n => n.length > 2);

    // 2. CÁLCULO DE CARGA TÉCNICA (Protección de Cuota Pro)
    const effectiveNicheCount = nicheList.length > 0 ? nicheList.length : Number(nicheLimit || 5);
    const effectiveEliteLimit = Number(eliteLimit || 10);

    const totalEstimatedCredits = effectiveNicheCount + (effectiveNicheCount * effectiveEliteLimit);

    // BLOQUEO PREVENTIVO
    if (totalEstimatedCredits > 100) {
      console.warn(`🛑 Bloqueo de ráfaga: Solicitados ${totalEstimatedCredits} créditos.`);
      return res.status(403).json({ 
        error: 'Configuración excede el límite de ráfaga Pro (100 créditos/hora).',
        estimated: totalEstimatedCredits,
        limit: 100
      });
    }

    // 3. ENVÍO VÍA PUB/SUB (En lugar de Axios)
    const messageData = {
      niche: niches,
      nicheLimit: effectiveNicheCount,
      eliteLimit: effectiveEliteLimit,
      country: country || 'CL',
      manual: nicheList.length > 0
    };

    // Publicamos el mensaje en el canal que el Discovery Worker está escuchando
    const dataBuffer = Buffer.from(JSON.stringify(messageData));
    const messageId = await pubsub.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });

    console.log(`✅ Mensaje publicado en Pub/Sub: ${messageId}`);

    // 4. Respuesta exitosa con telemetría
    res.status(202).json({ 
      message: 'Análisis iniciado correctamente vía Pub/Sub',
      jobId: messageId, // Usamos el ID del mensaje como JobId
      processed_niches: nicheList.length > 0 ? nicheList : `IA generará ${effectiveNicheCount} nichos`,
      telemetry: {
        total_estimated_credits: totalEstimatedCredits,
        niche_breadth: effectiveNicheCount,
        elite_depth_per_niche: effectiveEliteLimit
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('🚨 Error enviando tarea a Pub/Sub:', errorMessage);
    
    res.status(502).json({ 
      error: 'No se pudo comunicar con Google Cloud Pub/Sub.',
      details: errorMessage 
    });
  }
};