import { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { CJDropshippingService } from '../services/cj.service.js';
// ⚡ CORRECCIÓN: Importamos la instancia 'emailService', no el método suelto
import { emailService } from '../email.service.js'; 

const cjService = new CJDropshippingService();

export const syncCJTracking = async (req: Request, res: Response) => {
  console.log("🔍 [Cron] Buscando números de tracking en CJ...");

  try {
    // 1. Buscar órdenes que ya se enviaron a CJ pero aún no tienen tracking
    const { rows: orders } = await pool.query(`
      SELECT o.id, c.email, c.first_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status = 'PROCESSING_SUPPLIER' AND o.tracking_number IS NULL
    `);

    for (const order of orders) {
      const cjData = await cjService.getOrderTracking(order.id);

      if (cjData && cjData.trackingNumber) {
        console.log(`📦 Tracking encontrado para ${order.id}: ${cjData.trackingNumber}`);
        
        // 2. Guardar en BD y cambiar estado
        await pool.query(
          `UPDATE orders SET tracking_number = $1, status = 'SHIPPED' WHERE id = $2`,
          [cjData.trackingNumber, order.id]
        );

        // 3. Notificar al cliente llamando al método desde la instancia
        await emailService.sendTrackingEmail(order.email, order.first_name, cjData.trackingNumber, cjData.logisticName);
      }
    }

    res.status(200).json({ message: `Sincronización de tracking completada.` });
  } catch (error: any) {
    console.error("🚨 Error sincronizando tracking:", error);
    res.status(500).json({ error: "Fallo interno" });
  }
};