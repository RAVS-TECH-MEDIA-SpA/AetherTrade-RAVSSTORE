import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  try {
    const { items, customerInfo, shippingAddress, fbc, fbp, clientUserAgent, eventSourceUrl } = await request.json();
    const API_URL = process.env.API_GATEWAY_URL;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 });
    }

    // 1. Guardar orden en API Gateway + pasarle fbc/fbp para que lo guarde en Redis
    const orderRes = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        shipping_address: shippingAddress,
        fbc, // <-- INTEGRACIÓN 1
        fbp, // <-- INTEGRACIÓN 1
        client_user_agent: clientUserAgent,
        event_source_url: eventSourceUrl
      })
    });
    
    if (!orderRes.ok) throw new Error('No se pudo crear orden en gateway');
    const draftOrder = await orderRes.json();

    // 2. Crear preferencia MercadoPago
    const preference = new Preference(client);
    const mpResponse = await preference.create({
      body: {
        items: items.map((item: any) => ({
          id: item.product_id,
          title: item.title,
          quantity: Number(item.quantity),
          unit_price: Number(item.price),
          currency_id: 'CLP'
        })),
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_URL}/checkout/success`,
          failure: `${process.env.NEXT_PUBLIC_URL}/checkout/failure`,
          pending: `${process.env.NEXT_PUBLIC_URL}/checkout/pending`,
        },
        auto_return: "approved",
        notification_url: `${process.env.API_WEBHOOK_URL}/webhooks/mercadopago`,
        statement_descriptor: "RAVS STORE",
        external_reference: draftOrder.id
      }
    });

    return NextResponse.json({ init_point: mpResponse.init_point });

  } catch (error: any) {
    console.error('🚨 Error Checkout Route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}