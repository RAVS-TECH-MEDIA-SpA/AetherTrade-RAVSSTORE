import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customerInfo, shippingAddress, fbc, fbp, clientUserAgent } = body;
    const API_URL = process.env.API_GATEWAY_URL;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Carrito vacío' }, { status: 400 });
    }

    // 1. Preparamos el payload exacto para nuestro CheckoutController en el Gateway
    const normalizedItems = items.map((item: any) => ({
      productId: item.productId || item.product_id || item.id,
      variantId: item.variantId || item.variant_id || null,
      title: item.title,
      price: Number(item.price),
      quantity: Number(item.quantity)
    }));

    const gatewayPayload = {
      items: normalizedItems,
      customer: {
        email: customerInfo?.email || 'cliente@ravsstore.com',
        firstName: customerInfo?.name?.split(' ')[0] || customerInfo?.name || 'Cliente',
        lastName: customerInfo?.name?.split(' ').slice(1).join(' ') || 'General',
        phone: customerInfo?.phone || null
      },
      shippingAddress: shippingAddress,
      tracking: { fbc, fbp }
    };
console.log("🚀 Preparado gatewayPayload para /api/checkout:", gatewayPayload);
console.log("🚀 Preparado gatewayPayload API_URL:", API_URL);

    // 2. ⚡ EL CAMBIO CLAVE: Llamamos a /api/checkout del Gateway, NO a /api/orders
    const gatewayRes = await fetch(`${API_URL}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pasamos la IP y el User-Agent reales para el Meta CAPI
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '0.0.0.0',
        'user-agent': clientUserAgent || request.headers.get('user-agent') || ''
      },
      body: JSON.stringify(gatewayPayload)
    });
console.log("🚀 Respuesta del Gateway:", gatewayRes.ok);

    if (!gatewayRes.ok) {
      const errData = await gatewayRes.json().catch(() => ({ error: 'Error desconocido en Gateway' }));
      throw new Error(errData.error || 'No se pudo procesar el pago en el Gateway');
    }

    const gatewayData = await gatewayRes.json();
console.log("🚀 Datos recibidos del Gateway:", gatewayData);
    // 3. El Gateway hizo todo el trabajo y nos devuelve el link de Mercado Pago
    return NextResponse.json({ init_point: gatewayData.init_point });

  } catch (error: any) {
    console.error('🚨 Error Checkout Route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}