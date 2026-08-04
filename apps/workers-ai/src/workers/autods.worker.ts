import cron from 'node-cron';
import { pool } from '../lib/db.js'; // <-- CORREGIDO A POOL
import { FulfillmentService } from '../fulfillment.service.js';

const fulfillment = new FulfillmentService();

// Se ejecuta cada 4 horas: "0 */4 * * *"
cron.schedule('0 */4 * * *', async () => {
  console.log('🤖 [AutoDS Worker] Despertando para procesar órdenes pagadas...');

  try {
    // 1. Buscar todas las órdenes pagadas y listas
    const { rows: orders } = await pool.query( // <-- USANDO POOL
      `SELECT id FROM orders WHERE status = 'PAID_READY'`
    );

    if (orders.length === 0) {
      console.log('💤 [AutoDS Worker] No hay órdenes nuevas para procesar.');
      return;
    }

    console.log(`📦 [AutoDS Worker] Se encontraron ${orders.length} órdenes para procesar.`);

    // 2. Procesarlas secuencialmente para no saturar la API
    for (const order of orders) {
      await fulfillment.processOrderToAutoDS(order.id);
      
      // Pequeña pausa de 2 segundos entre pedidos para evitar Rate Limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🏁 [AutoDS Worker] Ciclo finalizado exitosamente.');

  } catch (error) {
    console.error('🚨 [AutoDS Worker] Error crítico en el ciclo:', error);
  }
});