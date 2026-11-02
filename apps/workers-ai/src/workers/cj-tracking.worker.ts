import { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { CJDropshippingService } from '../services/cj.service.js';
// ⚡ CORRECCIÓN: Importamos la instancia 'emailService', no el método suelto
import { emailService } from '../email.service.js'; 

const cjService = new CJDropshippingService();

export const syncCJTracking = async (req: Request, res: Response) => {
  console.log("🔍 [Cron] Buscando números de tracking en CJ (Modo Lote)...");

  try {
    // 1. ⚡ FIX: Agregamos o.ali_order_id al SELECT para que no llegue "undefined"
    // Buscamos las que ya enviamos al proveedor (PROCESSING_SUPPLIER)
    const { rows: orders } = await pool.query(`
      SELECT o.id, o.ali_order_id, c.email, c.first_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status IN ('PROCESSING_SUPPLIER', 'SUPPLIER_PAYMENT_REQUIRED')
        AND o.tracking_number IS NULL 
        AND o.ali_order_id IS NOT NULL
    `);

    if (orders.length === 0) {
      return res.status(200).json({ message: "No hay órdenes pendientes de tracking." });
    }

    // 2. Extraer solo los IDs para armar la petición Batch
    const cjOrderIds = orders.map(order => order.ali_order_id);
    console.log(`📦 Consultando tracking para ${cjOrderIds.length} órdenes en lote...`);

    // 3. Consultar a CJ Dropshipping en bloque (hasta 100 por petición)
    const cjDataArray = await cjService.getOrderTrackingBatch(cjOrderIds);

    if (cjDataArray && Array.isArray(cjDataArray)) {
      for (const cjOrder of cjDataArray) {
        // CJ devuelve trackNumber vacío ("") si aún no se ha enviado
        if (cjOrder.trackNumber && cjOrder.trackNumber.trim() !== "") {
          console.log(`✅ Tracking encontrado para ${cjOrder.cjOrderCode}: ${cjOrder.trackNumber}`);
          
          // Buscar a qué orden local le pertenece este tracking
          const localOrder = orders.find(o => o.ali_order_id === cjOrder.cjOrderCode);
          
          if (localOrder) {
            // Guardar en BD y cambiar estado a SHIPPED
            await pool.query(
              `UPDATE orders SET tracking_number = $1, status = 'SHIPPED' WHERE id = $2`,
              [cjOrder.trackNumber, localOrder.id]
            );

            // Notificar al cliente llamando al método desde la instancia
            await emailService.sendTrackingEmail(localOrder.email, localOrder.first_name, cjOrder.trackNumber, cjOrder.logisticName);
          }
        }
      }
    }

    res.status(200).json({ message: `Sincronización de tracking en lote completada.` });
  } catch (error: any) {
    console.error("🚨 Error sincronizando tracking:", error);
    res.status(500).json({ error: "Fallo interno" });
  }
};