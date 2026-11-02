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

export const findProductsForAssistant = async (queryStr: string, country: string) => {
  const stopWords = new Set([
    'busco', 'quiero', 'necesito', 'algo', 'para', 'con', 'que', 'tiene',
    'tienen', 'producto', 'productos', 'recomienda', 'recomendar', 'por',
    'favor', 'hola', 'una', 'uno', 'unos', 'unas', 'del', 'las', 'los'
  ]);
  const terms = [...new Set(
    queryStr
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(term => term.length >= 3 && !stopWords.has(term))
  )].slice(0, 6);

  const result = await pool.query(`
    SELECT
      p.id,
      p.aliexpress_id,
      p.title_original,
      p.image_url,
      p.marketing_copy,
      p.suggested_price_local,
      p.estimated_transit_days,
      (
        COALESCE(p.total_stock, 0) > 0
        OR EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.is_active = true AND v.stock > 0
        )
      ) AS in_stock,
      c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'WINNER'
      AND p.target_country = $1
      AND (
        cardinality($2::text[]) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest($2::text[]) AS keyword(term)
          WHERE p.title_original ILIKE '%' || keyword.term || '%'
             OR p.marketing_copy->>'title_localized' ILIKE '%' || keyword.term || '%'
             OR c.name ILIKE '%' || keyword.term || '%'
        )
      )
      AND (
        COALESCE(p.total_stock, 0) > 0
        OR EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.is_active = true AND v.stock > 0
        )
      )
    ORDER BY (
      SELECT COUNT(*)
      FROM unnest($2::text[]) AS keyword(term)
      WHERE p.title_original ILIKE '%' || keyword.term || '%'
         OR p.marketing_copy->>'title_localized' ILIKE '%' || keyword.term || '%'
         OR c.name ILIKE '%' || keyword.term || '%'
    ) DESC, p.net_margin_usd DESC NULLS LAST
    LIMIT 8
  `, [country, terms]);

  return result.rows;
};