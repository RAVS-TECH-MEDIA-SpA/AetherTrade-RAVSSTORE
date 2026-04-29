import { Router } from 'express';
import { Pool } from 'pg'; // Reutilizando tu conexión a base de datos
import { pool } from '../../workers-ai/src/lib/db.js'; // Importamos el pool de conexión directa

const router = Router();


/**
 * GET /api/winners
 * Lista los productos que Gemini marcó como ganadores.
 */
router.get('/winners', async (req, res) => {
  const { country } = req.query; // Filtro opcional: ES o CL
  
  try {
    let query = `
      SELECT id, item_id, title_original, base_cost_usd, 
             suggested_price_local, net_margin_usd, roi_percent, 
             status, target_country, marketing_copy, ai_verdict
      FROM products 
      WHERE status = 'WINNER'
    `;
    
    const params: any[] = [];
    if (country) {
      query += ` AND target_country = $1`;
      params.push(country);
    }

    query += ` ORDER BY roi_percent DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo winners:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PATCH /api/products/:id/publish
 * Cambia el estado a PUBLISHED para que aparezca en la landing de Next.js
 */
router.patch('/products/:id/publish', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      `UPDATE products SET status = 'PUBLISHED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rowCount === 0) return res.status(404).send('Producto no encontrado');
    
    res.json({ message: '🚀 Producto publicado en Ravstore', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al publicar' });
  }
});

export default router;