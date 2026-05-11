import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const API_URL = process.env.API_GATEWAY_URL;

  try {
    const res = await fetch(`${API_URL}/api/products/${id}`);
    if (!res.ok) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error de conexión con API Gateway' }, { status: 500 });
  }
}

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { quantity } = await request.json();
    const API_URL = process.env.API_GATEWAY_URL;

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
    }

    // CONSULTA A API GATEWAY EN LUGAR DE DB DIRECTA
    const res = await fetch(`${API_URL}/api/products/${id}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Producto no encontrado en Gateway' }, { status: 404 });
    }

    const product = await res.json();

    // Extraer datos localizados
    const productName = product.marketing_copy?.title_localized || product.title_original;
    const unitPrice = parseFloat(product.suggested_price_local);
    const country = product.target_country; 

    const currency = country === 'CL' ? 'CLP' : (country === 'MX' ? 'MXN' : 'BRL');

    const preference = new Preference(client);

    const mpResponse = await preference.create({
      body: {
        items: [
          {
            id: product.id,
            title: productName,
            quantity: Number(quantity),
            unit_price: unitPrice,
            currency_id: currency
          }
        ],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_URL}/success`,
          failure: `${process.env.NEXT_PUBLIC_URL}/failure`,
          pending: `${process.env.NEXT_PUBLIC_URL}/pending`,
        },
        auto_return: "approved",
        notification_url: `${process.env.API_WEBHOOK_URL}/webhooks/mercadopago`,
        statement_descriptor: "AETHER TRADE",
        external_reference: product.id 
      }
    });

    return NextResponse.json({ init_point: mpResponse.init_point });

  } catch (error: any) {
    console.error('🚨 Error en Checkout MP:', error.message);
    return NextResponse.json(
      { error: 'Error al procesar el pago', detail: error.message }, 
      { status: 500 }
    );
  }
}