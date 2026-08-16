// En tu controlador de AutoDS (ej. autodsService.ts)
import { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import axios from 'axios';

const AUTODS_API_TOKEN = process.env.AUTODS_API_TOKEN;

// ⚡ Convertido en un Endpoint protegido
export const syncAutodsStock = async (req: Request, res: Response) => {
  // 1. Verificación de Seguridad (Evita que cualquiera ejecute esto)
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    console.warn('🚨 [Stock Sync] Intento de acceso no autorizado.');
    return res.status(401).json({ error: 'No autorizado' });
  }

  console.log('🔄 [Stock Sync] Iniciando sincronización de stock con AutoDS...');

  try {
    const { rows: linkedProducts } = await pool.query(
      `SELECT id, autods_item_id FROM products WHERE autods_item_id IS NOT NULL`
    );

    if (linkedProducts.length === 0) {
      console.log('💤 [Stock Sync] No hay productos enlazados a AutoDS aún.');
      return res.status(200).json({ message: 'No hay productos enlazados' });
    }

    console.log(`📦 [Stock Sync] Revisando stock de ${linkedProducts.length} productos...`);

    const response = await axios.get('https://api.autods.com/openapi/store-products', {
      headers: {
        'Authorization': `Bearer ${AUTODS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const autodsProducts = response.data; 

    for (const localProduct of linkedProducts) {
      const remoteProduct = autodsProducts.find(
        (rp: any) => String(rp.id) === String(localProduct.autods_item_id)
      );

      if (remoteProduct) {
        const totalStock = remoteProduct.stock || 0;
        const isAvailable = totalStock > 0;

        await pool.query(
          `UPDATE products SET total_stock = $1, status = $2 WHERE id = $3`,
          [totalStock, isAvailable ? 'ACTIVE' : 'OUT_OF_STOCK', localProduct.id]
        );

        await pool.query(
          `UPDATE product_variants SET stock = $1, is_active = $2 WHERE product_id = $3`,
          [totalStock, isAvailable, localProduct.id]
        );

        console.log(`✅ [Stock Sync] Producto ${localProduct.id} actualizado -> Stock: ${totalStock}`);
      } else {
        console.warn(`⚠️ [Stock Sync] Producto ${localProduct.autods_item_id} no encontrado en AutoDS.`);
      }
    }

    console.log('🏁 [Stock Sync] Sincronización finalizada exitosamente.');
    return res.status(200).json({ success: true, processed: linkedProducts.length });

  } catch (error: any) {
    console.error('🚨 [Stock Sync] Error crítico conectando con AutoDS:', error.message || error);
    return res.status(500).json({ error: 'Error sincronizando stock' });
  }
};