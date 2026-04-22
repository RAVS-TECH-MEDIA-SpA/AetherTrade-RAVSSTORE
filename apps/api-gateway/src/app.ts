import express from 'express';
import Stripe from 'stripe';
import { PubSub } from '@google-cloud/pubsub';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const pubsub = new PubSub();
const app = express();

// Webhook de Stripe para confirmar la venta y disparar el envío automático
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Publicamos en Pub/Sub para que el Worker AI procese el pedido en AliExpress
    const data = JSON.stringify({
      orderId: session.id,
      customer: session.customer_details,
      amount: session.amount_total
    });
    
    await pubsub.topic('order-finalized').publish(Buffer.from(data));
  }
  res.json({ received: true });
});

export default app;