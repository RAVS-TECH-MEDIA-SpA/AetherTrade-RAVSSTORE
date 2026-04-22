import cron from 'node-cron';
import { query } from '../database';
import { TelegramService } from '../services/telegram.service';

const telegram = new TelegramService();

// Se ejecuta cada 4 horas
cron.schedule('0 */4 * * *', async () => {
  const res = await query(
    `SELECT COUNT(*) as count, SUM(net_amount_usd) as total 
     FROM orders 
     WHERE status = 'pending_payment'`
  );

  const { count, total } = res.rows[0];

  if (parseInt(count) > 0) {
    await telegram.send(`
💳 <b>Lote de Pago Pendiente</b>
Hay <b>${count}</b> órdenes listas en AliExpress.
Total a pagar aprox: <b>$${parseFloat(total).toFixed(2)} USD</b>.
<i>Es momento de entrar y procesar el lote.</i>
    `);
  }
});