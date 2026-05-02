// apps/api-gateway/src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import { pool } from '../../../workers-ai/src/lib/db'; // <--- CORREGIDO: Apuntando a src/database.ts
import axios from 'axios';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const kpiQuery = `
      SELECT 
        COALESCE(SUM(amount_usd), 0) as total_sales,
        COALESCE(SUM(net_profit_usd), 0) as total_profit,
        (SELECT COUNT(*) FROM products WHERE status = 'WINNER') as winners_count,
        (SELECT COUNT(*) FROM products) as total_competitors
      FROM sales_performance
    `;
    
    const kpiRes = await pool.query(kpiQuery);
    const stats = kpiRes.rows[0];

    const avgMargin = stats.total_sales > 0 
      ? (stats.total_profit / stats.total_sales) * 100 
      : 0;

    const countrySalesQuery = `
      SELECT country_code, SUM(amount_usd) as total 
      FROM sales_performance 
      GROUP BY country_code
    `;
    const countryRes = await pool.query(countrySalesQuery);

    res.json({
      kpis: [
        { title: 'Total Sales', value: `$${Number(stats.total_sales).toLocaleString()}`, trend: 12.3, icon: 'payments' },
        { title: 'Winners Found', value: stats.winners_count, trend: 5.0, icon: 'auto_awesome' },
        { title: 'Avg Margin', value: `${avgMargin.toFixed(1)}%`, trend: -1.2, icon: 'trending_up' },
        { title: 'Competitors', value: stats.total_competitors, trend: 2.1, icon: 'group' }
      ],
      countrySales: {
        labels: countryRes.rows.map(r => r.country_code),
        datasets: [{ data: countryRes.rows.map(r => r.total), backgroundColor: '#00f2ff' }]
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInventory = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, title_original as name, target_country as source, 
             roi_percent as margin, sales_count as sales_30d, status, image_url
      FROM products 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// PUENTE CON WORKER-AI (Puerto 8080)
export const triggerAnalysis = async (req: Request, res: Response) => {
  try {
    const { niche, country } = req.body;
    console.log(`🚀 Disparando análisis para nicho: ${niche} en ${country}`);

    // Llamada al worker de IA
    const workerRes = await axios.post('http://localhost:8080/analyze', {
      niche,
      country
    });

    res.json({ message: 'Análisis iniciado correctamente', workerResponse: workerRes.data });
  } catch (error: any) {
    console.error('🚨 Error al contactar Worker-AI:', error.message);
    res.status(502).json({ error: 'No se pudo contactar al motor de IA' });
  }
};