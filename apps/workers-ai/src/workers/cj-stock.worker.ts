import { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { CJDropshippingService } from '../services/cj.service.js';

const cjService = new CJDropshippingService();

export const syncCJStock = async (req: Request, res: Response) => {
  console.log("📦 [Cron] Iniciando sincronización de stock con CJ Dropshipping...");

  try {
    // 1. Obtener todas las variantes activas de tu BD
    const { rows: variants } = await pool.query(`
      SELECT id, ali_sku_id as cj_variant_id, stock 
      FROM product_variants 
      WHERE is_active = true
    `);

    let updatedCount = 0;
    let outOfStockCount = 0;

    // 2. Iterar sobre los productos y consultar a China
    for (const variant of variants) {
      if (!variant.cj_variant_id) continue;

      const realStock = await cjService.getVariantStock(variant.cj_variant_id);

      // Si devuelve null (error de red/API), saltamos para no apagar el producto por error
      if (realStock === null) continue;

      // Si el inventario cambió respecto a nuestra BD, actualizamos
      if (realStock !== variant.stock) {
        const isActive = realStock > 0;
        
        await pool.query(
          `UPDATE product_variants 
           SET stock = $1, is_active = $2, updated_at = NOW() 
           WHERE id = $3`,
          [realStock, isActive, variant.id]
        );

        updatedCount++;
        if (!isActive) outOfStockCount++;
        
        console.log(`🔄 Variación de stock [VID: ${variant.cj_variant_id}] -> Nuevo Stock: ${realStock} | Activo: ${isActive}`);
      }
    }

    console.log(`✅ [Stock Sync] Completado. ${updatedCount} actualizados. ${outOfStockCount} productos agotados.`);
    res.status(200).json({ message: 'Sincronización de inventario completada.', updatedCount, outOfStockCount });
  } catch (error: any) {
    console.error("🚨 Error sincronizando stock:", error);
    res.status(500).json({ error: "Fallo interno en el Cron Job" });
  }
};