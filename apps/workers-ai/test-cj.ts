import dotenv from 'dotenv';
dotenv.config();

import { pool } from './src/lib/db.js'; // Ajusta la ruta si tu bd está en otro lado
import { CJDropshippingService } from './src/services/cj.service.js'; // Ajusta la ruta

const cjService = new CJDropshippingService();

async function runTest() {
  console.log("⚙️ [Terminal] Iniciando ejecución manual hacia CJ Dropshipping...");

  try {
    const { rows: orders } = await pool.query(`
      SELECT o.id as order_id, o.total_amount_local, o.total_amount_usd,
             c.email, c.first_name, c.last_name, c.phone,
             a.street, a.number, a.city, a.state_province, a.postal_code, a.country_code
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_addresses a ON o.address_id = a.id
      WHERE o.status = 'PAID_READY' 
      LIMIT 50
    `);

    if (orders.length === 0) {
      console.log("✅ Sin órdenes pendientes en estado PAID_READY.");
      process.exit(0);
    }

    for (const order of orders) {
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
        const actualUnitCost = Number(item.unit_cost_usd) > 0 
            ? Number(item.unit_cost_usd) 
            : Number(item.base_cost_usd) + Number(item.additional_cost_usd) + Number(item.shipping_cost_usd);
        
        totalCostUsd += (actualUnitCost * item.quantity); 
        rateToUsd = Number(item.rate_to_usd) || 1;
      });

      const realTotalAmountUsd = Number(order.total_amount_usd) > 0 
          ? Number(order.total_amount_usd) 
          : Number(order.total_amount_local) / rateToUsd;

      const marginUsd = realTotalAmountUsd - totalCostUsd;

      console.log(`\n📊 [Orden ${order.order_id}] Venta: $${realTotalAmountUsd.toFixed(2)} USD | Costo CJ: $${totalCostUsd.toFixed(2)} USD | Margen: $${marginUsd.toFixed(2)} USD`);

      if (marginUsd <= 0) {
        console.warn(`⚠️ [ALERTA] Orden ${order.order_id} sin margen. Marcando para revisión manual.`);
        await pool.query(`UPDATE orders SET status = 'MANUAL_REVIEW_PROFIT' WHERE id = $1`, [order.order_id]);
        continue; 
      }

      console.log(`📦 [DEBUG PAYLOAD A CJ] Datos estructurados para la orden ${order.order_id}:`, JSON.stringify({ order, items }, null, 2));

      try {
        const cjResponse = await cjService.createOrder(order, items);

        if (cjResponse && (cjResponse.code === 200 || cjResponse.result === true)) {
          const cjOrderId = String(cjResponse.data || 'CJ-PENDING').substring(0, 100);
          await pool.query(`UPDATE orders SET status = 'PROCESSING_SUPPLIER', ali_order_id = $1 WHERE id = $2`, [cjOrderId, order.order_id]);
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

    console.log(`\n🎉 Lote completado. ${orders.length} procesadas.`);
    process.exit(0); // Cierra el proceso de terminal con éxito

  } catch (error: any) {
    console.error("🚨 Error ejecutando lote CJ:", error);
    process.exit(1); // Cierra el proceso de terminal con error
  }
}

// Disparar la función
runTest();