import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { processProductPricing } from '@/lib/api'; // ⚡ Importamos nuestro motor de precios

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
    data = processProductPricing(data); // ⚡ Aseguramos que la ruta GET también responda con la data masticada
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
    
    // ⚡ AÑADIDO: Capturamos el variantId que ahora nos enviará el carrito
    const { quantity, customerInfo, shippingAddress, variantId } = await request.json();
    const API_URL = process.env.API_GATEWAY_URL;

    if (!quantity || quantity < 1 || !shippingAddress) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para el envío' }, { status: 400 });
    }

    const resProduct = await fetch(`${API_URL}/api/products/${id}`);
    if (!resProduct.ok) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    
    // ⚡ Procesamos el producto con la MISMA fórmula de la landing
    let product = await resProduct.json();
    product = processProductPricing(product);

    let productName = product.marketing_copy?.title_localized || product.title_original;
    
    // ⚡ FIX GRAVE DE MERCADOPAGO: Asignamos el precio correcto dependiendo de la variante
    let finalUnitPrice = product.calculated_min_price; 

    if (variantId && product.variants) {
        const selectedVariant = product.variants.find((v: any) => v.ali_sku_id === variantId || v.id === variantId);
        if (selectedVariant) {
            finalUnitPrice = selectedVariant.calculated_price_local;
            productName = `${productName} - ${selectedVariant.color || ''} ${selectedVariant.size || ''}`.trim();
        }
    }

    const country = product.target_country; 
    const currency = country === 'CL' ? 'CLP' : (country === 'MX' ? 'MXN' : 'BRL');

    const orderRes = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.id,
        quantity: Number(quantity),
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        shipping_address: shippingAddress, 
        status: 'PENDING_PAYMENT'
      })
    });
    
    if (!orderRes.ok) throw new Error('No se pudo crear la orden pendiente');
    const draftOrder = await orderRes.json();

    const preference = new Preference(client);
    const mpResponse = await preference.create({
      body: {
        items: [
          {
            id: product.id,
            title: productName,
            quantity: Number(quantity),
            unit_price: finalUnitPrice, // ⚡ Precio 100% blindado y redondeado
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