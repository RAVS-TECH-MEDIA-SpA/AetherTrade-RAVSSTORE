import cron from 'node-cron';
import { pool } from '../lib/db.js';
import axios from 'axios';

const AUTODS_API_TOKEN = process.env.AUTODS_API_TOKEN;

// Se ejecuta cada 6 horas: "0 */6 * * *"
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 [Stock Sync] Iniciando sincronización de stock con AutoDS...');

  try {
    // 1. Obtener los productos que ya están enlazados con AutoDS
    const { rows: linkedProducts } = await pool.query(
      `SELECT id, autods_item_id FROM products WHERE autods_item_id IS NOT NULL`
    );

    if (linkedProducts.length === 0) {
      console.log('💤 [Stock Sync] No hay productos enlazados a AutoDS aún.');
      return;
    }

    console.log(`📦 [Stock Sync] Revisando stock de ${linkedProducts.length} productos...`);

    // 2. Consultar la API de AutoDS (Obtener lista de productos en tu tienda)
    // Nota: El endpoint exacto puede variar según la doc de AutoDS, este es el estándar.
    const response = await axios.get('https://api.autods.com/openapi/store-products', {
      headers: {
        'Authorization': `Bearer ${AUTODS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const autodsProducts = response.data; // Asumiendo que devuelve un array de items

    // 3. Procesar y comparar
    for (const localProduct of linkedProducts) {
      // Buscar el producto en la respuesta de AutoDS
      const remoteProduct = autodsProducts.find(
        (rp: any) => String(rp.id) === String(localProduct.autods_item_id)
      );

      if (remoteProduct) {
        // En AutoDS, si el stock es mayor a 0, está disponible
        const totalStock = remoteProduct.stock || 0;
        const isAvailable = totalStock > 0;

        // Actualizar el producto maestro
        await pool.query(
          `UPDATE products 
           SET total_stock = $1, 
               status = $2 
           WHERE id = $3`,
          [totalStock, isAvailable ? 'ACTIVE' : 'OUT_OF_STOCK', localProduct.id]
        );

        // Si manejas variantes, también desactivamos las variantes para que desaparezcan del frontend
        await pool.query(
          `UPDATE product_variants 
           SET stock = $1, is_active = $2 
           WHERE product_id = $3`,
          [totalStock, isAvailable, localProduct.id]
        );

        console.log(`✅ [Stock Sync] Producto ${localProduct.id} actualizado -> Stock: ${totalStock} (${isAvailable ? 'Disponible' : 'Agotado'})`);
      } else {
        console.warn(`⚠️ [Stock Sync] Producto ${localProduct.autods_item_id} no encontrado en AutoDS. ¿Fue eliminado?`);
      }
    }

    console.log('🏁 [Stock Sync] Sincronización finalizada exitosamente.');

  } catch (error: any) {
    console.error('🚨 [Stock Sync] Error crítico conectando con AutoDS:', error.message || error);
  }
});