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

/**
 * Buscador predictivo de productos (Para el Navbar)
 */
export const searchProducts = async (queryStr: string, country?: string) => {
  // Buscamos coincidencias en el título original, en el título localizado (marketing_copy) o en la categoría
  const query = `
    SELECT 
      p.id, 
      p.aliexpress_id,
      p.title_original, 
      p.image_url, 
      p.marketing_copy,
      c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'WINNER'
    AND (
      p.title_original ILIKE $1 
      OR p.marketing_copy->>'title_localized' ILIKE $1
      OR c.name ILIKE $1
    )
    ${country ? 'AND p.target_country = $2' : ''}
    ORDER BY p.created_at DESC
    LIMIT 6;
  `;
  
  // Agregamos los comodines % para buscar la palabra en cualquier parte del texto
  const searchTerm = `%${queryStr}%`;
  const values = country ? [searchTerm, country] : [searchTerm];
  
  const res = await pool.query(query, values);
  return res.rows;
};