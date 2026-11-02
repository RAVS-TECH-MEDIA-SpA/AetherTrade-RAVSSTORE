import { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { CJDropshippingService } from '../services/cj.service.js';

const cjService = new CJDropshippingService();

export const processCJBatch = async (req: Request, res: Response) => {
  console.log("⚙️ [Cron] Iniciando lote B2C hacia CJ Dropshipping...");

  try {
    const { rows: orders } = await pool.query(`
      SELECT o.id as order_id, o.total_amount_local, o.total_amount_usd,
             c.email, c.first_name, c.last_name, c.phone, c.document_id,
             a.street, a.number, a.city, a.state_province, a.postal_code, a.country_code, a.details
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_addresses a ON o.address_id = a.id
      WHERE o.status = 'PAID_READY' 
      LIMIT 50
    `);

    if (orders.length === 0) {
      return res.status(200).json({ message: "Sin órdenes pendientes." });
    }

    for (const order of orders) {
      // ⚡ FIX: Hacemos JOIN con products y product_variants para rescatar costos y tasas de cambio reales
      const { rows: items } = await pool.query(`
        SELECT i.quantity, i.unit_cost_usd, v.ali_sku_id as cj_variant_id,
               p.base_cost_usd, v.additional_cost_usd, p.shipping_cost_usd, p.rate_to_usd
        FROM order_items i
        JOIN product_variants v ON i.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        WHERE i.order_id = $1
      `, [order.order_id]);

      let totalCostUsd = 0;
      let rateToUsd = 1;

      items.forEach(item => { 
        // ⚡ INTELIGENCIA: Si el checkout envió "0.00", calculamos el costo real en USD al vuelo
        const actualUnitCost = Number(item.unit_cost_usd) > 0 
            ? Number(item.unit_cost_usd) 
            : Number(item.base_cost_usd) + Number(item.additional_cost_usd) + Number(item.shipping_cost_usd);
        
        totalCostUsd += (actualUnitCost * item.quantity); 
        rateToUsd = Number(item.rate_to_usd) || 1;
      });

      // ⚡ INTELIGENCIA: Convertimos la venta a USD si viene en "0.00"
      const realTotalAmountUsd = Number(order.total_amount_usd) > 0 
          ? Number(order.total_amount_usd) 
          : Number(order.total_amount_local) / rateToUsd;

      const marginUsd = realTotalAmountUsd - totalCostUsd;

      console.log(`📊 [Orden ${order.order_id}] Venta: $${realTotalAmountUsd.toFixed(2)} USD | Costo CJ: $${totalCostUsd.toFixed(2)} USD | Margen: $${marginUsd.toFixed(2)} USD`);

      if (marginUsd <= 0) {
        console.warn(`⚠️ [ALERTA] Orden ${order.order_id} sin margen. Marcando para revisión manual.`);
        await pool.query(`UPDATE orders SET status = 'MANUAL_REVIEW_PROFIT' WHERE id = $1`, [order.order_id]);
        continue; 
      }

      // 🔍 DEBUG: Visibilidad total antes de golpear la API de CJ
      console.log(`📦 [DEBUG PAYLOAD A CJ] Datos estructurados para la orden ${order.order_id}:`, JSON.stringify({ order, items }, null, 2));

      // ⚡ Bloque de contención para que fallos de CJ no detengan el Cron
      try {
        const cjResponse = await cjService.createOrder(order, items);

        if (cjResponse && (cjResponse.code === 200 || cjResponse.result === true)) {
          const cjOrderId = cjResponse.data?.orderId || 'CJ-PENDING'; 
          
          // ⚡ APLICADO: Cambio de nombre de columna a ali_order_id
          await pool.query(`
            UPDATE orders 
            SET status = 'PROCESSING_SUPPLIER', ali_order_id = $1 
            WHERE id = $2
          `, [cjOrderId, order.order_id]);
          
          console.log(`✅ [CJ Éxito] Orden ${order.order_id} inyectada. CJ ID: ${cjOrderId}`);
        } else {
          console.error(`❌ [CJ Res] Error en lógica de negocio:`, cjResponse?.message);
          
          const msg = (cjResponse?.message || '').toLowerCase();
          const isBalanceIssue = msg.includes('balance') || msg.includes('wallet') || msg.includes('insufficient') || msg.includes('pay');
          const newStatus = isBalanceIssue ? 'SUPPLIER_PAYMENT_REQUIRED' : 'API_ERROR_RETRY';

          await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [newStatus, order.order_id]);
        }
      } catch (cjError: any) {
        const errorData = cjError.response?.data || {};
        const errorMessage = errorData.message || cjError.message || '';
        
        console.error(`🚨 [CJ Exception] Fallo al inyectar orden ${order.order_id}:`, errorMessage);

        const msg = errorMessage.toLowerCase();
        const isBalanceIssue = msg.includes('balance') || msg.includes('wallet') || msg.includes('insufficient') || msg.includes('pay');
        const newStatus = isBalanceIssue ? 'SUPPLIER_PAYMENT_REQUIRED' : 'API_ERROR_RETRY';

        await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [newStatus, order.order_id]);
      }
    }

    res.status(200).json({ message: `Lote completado. ${orders.length} procesadas.` });

  } catch (error: any) {
    console.error("🚨 Error ejecutando lote CJ:", error);
    res.status(500).json({ error: "Fallo interno en Cron Job" });
  }
};