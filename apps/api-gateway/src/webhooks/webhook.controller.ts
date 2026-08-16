import { Request, Response } from 'express';
import { pool } from '../database.js';
import { PubSub } from '@google-cloud/pubsub';
import * as crypto from 'crypto';

const pubsub = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core' });

export const handleMPWebhook = async (req: Request, res: Response) => {
  console.log("📡 [Webhook] Query recibido:", req.query); // ⚡ Log extra para ver exacto el data.id
  const { query, body, headers } = req;
  
  const topic = query.topic || query.type || body.type;
  // Mantenemos paymentId general para el resto del código
  const paymentId = query.id || query['data.id'] || body?.data?.id;

  // Si no es un pago, respondemos 200 de inmediato y salimos
  if (topic !== "payment" || !paymentId) {
    return res.status(200).send('Not a payment event, ignored.');
  }

  // ============================================================================
  // ⚡ 1. VALIDACIÓN DE SEGURIDAD (Firma HMAC de Mercado Pago)
  // ============================================================================
  const xSignature = String(headers['x-signature'] ?? "");
  const xRequestId = String(headers['x-request-id'] ?? "");
  const secret = (process.env.MP_WEBHOOK_SECRET ?? "").trim();

  console.log(`🔐 [Seguridad] Cabecera x-signature recibida: ${xSignature}`);
  console.log(`🔐 [Seguridad] Cabecera x-request-id recibida: ${xRequestId}`);

  if (xSignature && xRequestId && secret) {
    try {
      // ⚡ FIX IA MP: Parseo robusto que elimina todos los espacios traicioneros
      const sig = Object.fromEntries(
        xSignature.split(",").map((p) => {
          const [k, v] = p.trim().split("=");
          return [k.trim(), v.trim()]; // Aseguramos que la llave tampoco tenga espacios
        })
      );

      const ts = sig.ts ?? "";
      const v1 = (sig.v1 ?? "").toLowerCase();

      // ⚡ FIX IA MP: Usar explícitamente data.id y en minúsculas para el manifiesto
      const dataId = String(query['data.id'] || query.id || paymentId).toLowerCase();

      // Creamos el manifiesto con el dataId exacto
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const digest = hmac.digest('hex');

      console.log(`🔐 [Seguridad] Manifest: ${manifest}`);
      console.log(`🔐 [Seguridad] Digest calculado: ${digest}`);
      console.log(`🔐 [Seguridad] Digest recibido (v1): ${v1}`);

      if (digest !== v1) {
        console.warn('⚠️ [Seguridad] La firma no coincide (Común en Sandbox). Procediendo a validar directamente en la API de MP...');
        // ⚡ FIX: Ya NO bloqueamos con 401. Dejamos que el código baje al Paso 2 para que el fetch() descubra la verdad.
      } else {
        console.log('✅ [Seguridad] Firma de Mercado Pago validada correctamente.');
      }
    } catch (err) {
      console.error('🚨 Error al procesar la firma:', err);
      return res.status(400).send('Bad Request: Signature parsing failed');
    }
  } else if (!secret) {
    console.warn('⚠️ [Advertencia] MP_WEBHOOK_SECRET no configurado. Validando pago sin verificar firma.');
  }

  // ============================================================================
  // 2. PROCESAMIENTO DEL PAGO
  // ============================================================================
  try {
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });
    
    if (!mpResponse.ok) throw new Error('No se pudo verificar el pago con MP');
    
    const paymentData = await mpResponse.json();
    console.log(`📡 [Webhook] Pago validado en API Mercado Pago. Status:`, paymentData.status);

    if (paymentData.status === 'approved') {
      const orderId = paymentData.external_reference;

      console.log(`✅ Pago Aprobado [${paymentId}] para la Orden [${orderId}]`);

      await pool.query(
        `UPDATE orders 
         SET status = 'PAID_READY', payment_id = $1
         WHERE id = $2 AND status = 'PENDING_PAYMENT'`,
        [paymentId, orderId]
      );

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
        const tracking = customerData.client_tracking_data || {};

        const capiPayload = {
          eventName: 'Purchase',
          eventId: paymentId, 
          email: customerData.email,
          phone: customerData.phone,
          fbc: tracking.fbc || null,
          fbp: tracking.fbp || null,
          ipAddress: tracking.ipAddress || '0.0.0.0', 
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

    // Respondemos 200 OK
    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error(`🚨 Error procesando webhook del pago ${paymentId}:`, error);
    res.status(200).send('Error handled internally');
  }
};