import { Request, Response } from 'express';
import { pool } from '../database.js';
import { PubSub } from '@google-cloud/pubsub'; // ⚡ NUEVO: Importamos PubSub

const pubsub = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core' });

export const handleMPWebhook = async (req: Request, res: Response) => {
  const { query, body } = req;
  
  // MercadoPago a veces manda el id en query o en el body dependiendo de la versión
  const topic = query.topic || query.type || body.type;
  const paymentId = query.id || query['data.id'] || body?.data?.id;

  // 1. Siempre responder 200 INMEDIATAMENTE a Mercado Pago (Crítico para evitar reintentos de MP)
  res.sendStatus(200);

  if (topic === "payment" && paymentId) {
    try {
      // 2. Consultar el estado REAL del pago a MercadoPago (Seguridad anti-fraude)
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      
      if (!mpResponse.ok) throw new Error('No se pudo verificar el pago con MP');
      
      const paymentData = await mpResponse.json();

      // 3. Si fue aprobado, sacamos el external_reference (que es nuestro Order ID)
      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference;

        console.log(`✅ Pago Aprobado [${paymentId}] para la Orden [${orderId}]`);

        // 4. Actualizar la base de datos para que el Worker de AutoDS la encuentre
        await pool.query(
          `UPDATE orders 
           SET status = 'PAID_READY', payment_id = $1, mp_preference_id = $2
           WHERE id = $3 AND status = 'PENDING_PAYMENT'`,
          [paymentId, paymentData.order?.id, orderId]
        );

        // ============================================================================
        // ⚡ 5. NUEVO: LÓGICA DE META CAPI (PREPARAR DATOS Y ENVIAR A PUB/SUB)
        // ============================================================================
        
        // 5.1 Obtener los datos del cliente para el "hash" de Meta
        const orderRes = await pool.query(`
          SELECT o.total_amount_local, c.email, c.phone
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          WHERE o.id = $1
        `, [orderId]);

        // 5.2 Obtener los IDs de los productos comprados (content_ids)
        const itemsRes = await pool.query(`
          SELECT product_id FROM order_items WHERE order_id = $1
        `, [orderId]);

        if (orderRes.rows.length > 0) {
          const customerData = orderRes.rows[0];
          const contentIds = itemsRes.rows.map(row => String(row.product_id));

          // 5.3 Construir el Payload (Extrayendo IP y User Agent reales)
          const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
          const userAgent = req.headers['user-agent'];
          
          // Nota: Para fbc y fbp necesitas tener middleware 'cookie-parser' habilitado en Express
          const fbc = req.cookies?._fbc || null;
          const fbp = req.cookies?._fbp || null;

          const capiPayload = {
            eventName: 'Purchase',
            eventId: paymentId, // Usamos el payment_id para que haga "deduplicación" con el pixel del front
            email: customerData.email,
            phone: customerData.phone,
            fbc: fbc,
            fbp: fbp,
            ipAddress: clientIp,
            userAgent: userAgent,
            totalAmountLocal: Number(customerData.total_amount_local),
            contentIds: contentIds,
            eventSourceUrl: `https://ravsstore.com/checkout/success?order=${orderId}`
          };

          // 5.4 Publicar el mensaje asíncrono y olvidarnos (Fire and Forget)
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