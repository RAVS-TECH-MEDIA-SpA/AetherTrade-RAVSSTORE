import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(request: Request) {
  const formData = await request.formData();
  const sku = formData.get('sku') as string;

  // 1. Validar precio real en la DB para evitar ataques de manipulación de DOM
  // const product = await db.query('SELECT * FROM products WHERE sku = $1', [sku]);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `Product ${sku}` },
          unit_amount: 2990, // El precio en centavos (ej: 29.90 EUR)
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/p/${sku}`,
      shipping_address_collection: { allowed_countries: ['ES', 'DE', 'IT', 'NL', 'GB'] },
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}