// api-gateway/src/products/products.service.ts
import {pool} from '../database.js'; // Asegúrate que esta ruta apunte a tu pool de pg

/**
 * Obtiene un producto por su ID interno (UUID) o su AliExpress ID
 * ⚡ FIX: Comparamos ambas columnas como texto para soportar la transición a UUID de forma invisible sin romper controladores
 */
export const findByAliExpressId = async (idOrAliId: string) => {
  const query = `
    SELECT 
      p.*,
      c.name as category_name,
      (
        SELECT JSON_AGG(v.* ORDER BY v.id ASC)
        FROM product_variants v 
        WHERE v.product_id = p.id
      ) as variants,
      -- Extraemos metadatos del JSON raw (mapeado de las capturas de API)
      p.raw_details->'shipping'->'estimateDeliveryDate' as estimated_delivery,
      p.raw_details->'shipping'->'trackingAvailable' as has_tracking
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id::text = $1 OR p.aliexpress_id::text = $1
    LIMIT 1;
  `;

  try {
    const res = await pool.query(query, [idOrAliId]);
    return res.rows[0] || null;
  } catch (error: any) {
    console.error(`❌ Error en DB (findByAliExpressId): ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene todos los productos WINNER (para la Home de la Landing)
 */
export const findAllWinners = async (country?: string) => {
  const query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'WINNER'
    ${country ? 'AND p.target_country = $1' : ''}
    ORDER BY p.created_at DESC;
  `;
  const values = country ? [country] : [];
  const res = await pool.query(query, values);
  return res.rows;
};