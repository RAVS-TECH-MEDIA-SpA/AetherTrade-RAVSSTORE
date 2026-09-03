import { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { CJDropshippingService } from '../services/cj.service.js';

const cjService = new CJDropshippingService();

// ⚡ FUNCIÓN AUXILIAR DE RETRASO (Evita el bloqueo de 1 QPS de la API de China)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const syncCJStock = async (req: Request, res: Response) => {
  console.log("📦 [Cron] Iniciando sincronización de stock con CJ Dropshipping...");

  try {
    // 1. 🌟 QUERY CORREGIDA: Cambiado 'created_at' por 'updated_at' según tu esquema SQL real
    const { rows: variants } = await pool.query(`
      WITH unnested_variants AS (
        SELECT 
          id as product_id,
          (v_data->>'vid') as cj_variant_id,
          v_idx - 1 as variant_position -- Convertimos base 1 de Postgres a base 0 de JS
        FROM products,
        LATERAL jsonb_array_elements(raw_details->'variants') WITH ORDINALITY AS v(v_data, v_idx)
      ),
      numbered_pv AS (
        SELECT 
          id,
          product_id,
          stock,
          is_active,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at ASC) - 1 as pv_position -- 👈 CORRECCIÓN AQUÍ
        FROM product_variants
      )
      SELECT 
        npv.id,
        uv.cj_variant_id,
        npv.stock
      FROM numbered_pv npv
      JOIN unnested_variants uv ON npv.product_id = uv.product_id AND npv.pv_position = uv.variant_position`);

    let updatedCount = 0;
    let outOfStockCount = 0;

    console.log(`📊 [Stock Sync] Encontradas ${variants.length} variantes únicas para procesar...`);

    // 2. Iterar sobre los productos y consultar a China respetando las cuotas
    for (const variant of variants) {
      if (!variant.cj_variant_id) continue;

      // Pausa estratégica de 1.1 segundos para cumplir con la cuota de la API
      await delay(1100);

      const realStock = await cjService.getVariantStock(variant.cj_variant_id);

      // Si devuelve null (error de red/API), saltamos para no alterar el producto por error
      if (realStock === null) continue;

      // Si el inventario cambió respecto a nuestra BD, actualizamos con el dato real de su variante
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

// ⚡ DETECTOR DE EJECUCIÓN DIRECTA (CLI WORKER)
(async () => {
  const isDirectExecution = process.argv.some(arg => arg.includes('cj-stock.worker.ts')) || !process.env.NEXT_RUNTIME;

  if (isDirectExecution) {
    console.log("🚀 [Worker CLI] Ejecución directa detectada. Levantando entorno manual...");
    
    const mockRes = {
      status: (code: number) => {
        return {
          json: (data: any) => console.log(`💾 Respuesta del servidor [Status ${code}]:`, data)
        };
      }
    } as unknown as Response;

    await syncCJStock({} as Request, mockRes);
    
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log("🔌 Conexión TCP con PostgreSQL cerrada correctamente.");
    }
    
    process.exit(0);
  }
})();