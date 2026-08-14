import { Request, Response } from 'express';
import { pool } from '../database.js';
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core' });

export const handleMPWebhook = async (req: Request, res: Response) => {
  const { query, body } = req;
  
  const topic = query.topic || query.type || body.type;
  const paymentId = query.id || query['data.id'] || body?.data?.id;

  // 1. Responder 200 INMEDIATAMENTE
  res.sendStatus(200);

  if (topic === "payment" && paymentId) {
    try {
      // 2. Consultar el estado REAL del pago a MercadoPago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      
      if (!mpResponse.ok) throw new Error('No se pudo verificar el pago con MP');
      
      const paymentData = await mpResponse.json();

      // 3. Si fue aprobado, sacamos el external_reference (Order ID)
      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference;

        console.log(`✅ Pago Aprobado [${paymentId}] para la Orden [${orderId}]`);

        // ⚡ CORRECCIÓN DB: No sobreescribir mp_preference_id. Si quieres guardar el merchant_order, usa otra columna.
        await pool.query(
          `UPDATE orders 
           SET status = 'PAID_READY', payment_id = $1
           WHERE id = $2 AND status = 'PENDING_PAYMENT'`,
          [paymentId, orderId]
        );

        // ============================================================================
        // 5. LÓGICA DE META CAPI (LEYENDO LOS DATOS DEL CLIENTE DESDE LA BD)
        // ============================================================================
        
        // ⚡ CORRECCIÓN CAPI: Asumimos que tienes una columna 'client_tracking_data' (JSONB) en tu tabla orders
        const orderRes = await pool.query(`
          SELECT o.total_amount_local, o.client_tracking_data, c.email, c.phone
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          WHERE o.id = $1
        `, [orderId]);

        const itemsRes = await pool.query(`
          SELECT product_id FROM order_items WHERE order_id = $1
        `, [orderId]);

        if (orderRes.rows.length > 0) {
          const customerData = orderRes.rows[0];
          const contentIds = itemsRes.rows.map(row => String(row.product_id));

          // ⚡ Extraemos el tracking real que guardamos al momento del Checkout
          const tracking = customerData.client_tracking_data || {};

          const capiPayload = {
            eventName: 'Purchase',
            eventId: paymentId, 
            email: customerData.email,
            phone: customerData.phone,
            fbc: tracking.fbc || null,
            fbp: tracking.fbp || null,
            ipAddress: tracking.ipAddress || '0.0.0.0', // Fallback seguro
            userAgent: tracking.userAgent || '',
            totalAmountLocal: Number(customerData.total_amount_local),
            contentIds: contentIds,
            eventSourceUrl: `https://ravsstore.com/checkout/success?order=${orderId}`
          };

          await pubsub.topic('aether-meta-capi').publishMessage({
            data: Buffer.from(JSON.stringify(capiPayload)),
          });

          console.log(`📡 [Webhook] Evento Purchase de la orden [${orderId}] enviado a Meta CAPI Worker.`);
        }
      }
    } catch (error) {
      console.error(`🚨 Error procesando webhook del pago ${paymentId}:`, error);
    }
  }
};