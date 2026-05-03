import { Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../database';

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
    const result = await pool.query(`
      SELECT 
        id, 
        title_original as name, 
        'AliExpress' as source, 
        aliexpress_id as asin_sku, 
        roi_percent as margin, 
        sales_count as sales_30d, 
        status, 
        image_url 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('🚨 Error en getInventory:', error);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
};

/**
 * Trigger al Worker AI con soporte para múltiples nichos y límite de sugerencias
 */
export const triggerAnalysis = async (req: Request, res: Response) => {
  const { niches, country, limit } = req.body; // Cambiado 'niche' por 'niches' para reflejar el string con ";"
  const WORKER_URL = process.env.WORKER_AI_URL || 'http://localhost:8080';

  try {
    // 1. Convertimos el string "gaming; camping" en un array real
    const nicheList = String(niches || '')
      .split(';')
      .map(n => n.trim())
      .filter(n => n.length > 2);

    // if (nicheList.length === 0) {
    //   return res.status(400).json({ error: 'Se requiere al menos un término de búsqueda válido.' });
    // }

    // 2. Reenvío al Worker AI con el formato estructurado
    const response = await axios.post(`${WORKER_URL}/analyze`, {
      search_base: nicheList,
      max_suggestions: Number(limit) || 5, // Cantidad de nichos que la IA debe sugerir
      country: country || 'US',
      manual: true
    });

    res.status(202).json({ 
      message: 'Análisis iniciado correctamente',
      jobId: response.data.jobId,
      processed_niches: nicheList
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('🚨 Worker AI inalcanzable:', errorMessage);
    res.status(502).json({ error: 'El Worker AI no respondió.' });
  }
};