import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
// import { Pool } from 'pg';
import {pool} from '../database.js'; // Asegúrate que esta ruta apunte a tu pool de pg


@Injectable()
export class ProductsService {

  private readonly logger = new Logger(ProductsService.name);


async findByAliExpressId(id: string) {
  const query = `
    SELECT 
      p.*,
      c.name as category_name,
      (
        SELECT JSON_AGG(v.* ORDER BY v.id ASC)
        FROM product_variants v 
        WHERE v.product_id = p.id
      ) as variants,
      -- Extraemos la logística directamente del JSON raw
      p.raw_details->'shipping'->'estimateDeliveryDate' as estimated_delivery,
      p.raw_details->'shipping'->'serviceName' as courier_name,
      p.raw_details->'shipping'->'trackingAvailable' as has_tracking
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.aliexpress_id::text = $1
    LIMIT 1;
  `;
  const res = await pool.query(query, [id]);
  return res.rows[0];
}

  /**
   * Obtiene productos ganadores por el slug de la categoría
   */
  async findByCategorySlug(slug: string) {
    const query = `
      SELECT p.* FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE c.slug = $1 AND p.status = 'WINNER'
      ORDER BY p.updated_at DESC;
    `;
    
    const res = await pool.query(query, [slug]);
    return res.rows;
  }

  /**
   * Endpoint de Inventario (Utilizado por el home de la landing)
   */
  async findByStatus(status: string, country: string) {
    const query = `
      SELECT * FROM products 
      WHERE status = $1 AND target_country = $2
      ORDER BY updated_at DESC;
    `;
    const res = await pool.query(query, [status, country]);
    return res.rows;
  }
}