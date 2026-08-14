import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { processProductPricing } from '@/lib/api'; 

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const API_URL = process.env.API_GATEWAY_URL;

  try {
    const res = await fetch(`${API_URL}/api/products/${id}`);
    if (!res.ok) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    
    let data = await res.json();
    data = processProductPricing(data); 
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error de conexión con API Gateway' }, { status: 500 });
  }
}

export async function POST(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // ⚡ Capturamos todos los datos que envía el frontend (incluyendo variantId y tracking de Meta)
    const { quantity, customerInfo, shippingAddress, variantId, fbc, fbp } = await request.json();
    const API_URL = process.env.API_GATEWAY_URL;

    if (!quantity || quantity < 1 || !shippingAddress) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para el envío' }, { status: 400 });
    }

    const resProduct = await fetch(`${API_URL}/api/products/${id}`);
    if (!resProduct.ok) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    
    let product = await resProduct.json();
    product = processProductPricing(product);

    let productName = product.marketing_copy?.title_localized || product.title_original;
    let finalUnitPrice = product.calculated_min_price; 

    // Seleccionamos el precio y título correcto si el producto tiene variante
    if (variantId && product.variants) {
        const selectedVariant = product.variants.find((v: any) => v.ali_sku_id === variantId || v.id === variantId);
        if (selectedVariant) {
            finalUnitPrice = selectedVariant.calculated_price_local;
            productName = `${productName} - ${selectedVariant.color || ''} ${selectedVariant.size || ''}`.trim();
        }
    }

    const country = product.target_country; 
    const currency = country === 'CL' ? 'CLP' : (country === 'MX' ? 'MXN' : 'BRL');

    // ============================================================================
    // ⚡ LLAMADA AL API GATEWAY CON EL FORMATO ESTÁNDAR QUE ESPERA EL BACKEND
    // ============================================================================
    const clientUserAgent = request.headers.get('user-agent') || '';
    const eventSourceUrl = request.headers.get('referer') || '';

    const orderRes = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            productId: product.id, // ⚡ Enviamos el UUID real de la base de datos
            variantId: variantId || null, // ⚡ Enviamos la variante seleccionada
            title: productName,
            quantity: Number(quantity),
            price: finalUnitPrice
          }
        ],
        customer: {
          email: customerInfo.email,
          firstName: customerInfo.name?.split(' ')[0] || customerInfo.name,
          lastName: customerInfo.name?.split(' ').slice(1).join(' ') || 'Cliente',
          phone: customerInfo.phone || null
        },
        shippingAddress: shippingAddress,
        fbc: fbc || null,
        fbp: fbp || null,
        client_user_agent: clientUserAgent,
        event_source_url: eventSourceUrl
      })
    });
    
    if (!orderRes.ok) throw new Error('No se pudo crear la orden pendiente en el Gateway');
    const draftOrder = await orderRes.json();

    // Creamos la preferencia en MercadoPago
    const preference = new Preference(client);
    const mpResponse = await preference.create({
      body: {
        items: [
          {
            id: product.id,
            title: productName,
            quantity: Number(quantity),
            unit_price: finalUnitPrice, 
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
        external_reference: draftOrder.id 
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