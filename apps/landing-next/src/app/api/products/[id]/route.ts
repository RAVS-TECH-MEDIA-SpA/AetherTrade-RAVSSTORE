// apps/landing-next/src/app/api/checkout/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db'; 
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializamos el cliente de Mercado Pago
// Asegúrate de tener MP_ACCESS_TOKEN en tu archivo .env
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export async function POST(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Desenvolver parámetros (Next.js 15) y capturar body
    const { id } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
    }

    // 2. Consultar datos reales de la base de datos
    const query = `
      SELECT 
        id, 
        marketing_copy,        -- Contiene los textos en español/portugués
        suggested_price_local, -- El precio calculado para el mercado objetivo
        target_country 
      FROM products WHERE id = $1
    `;
    
    const dbRes = await pool.query(query, [id]);

    if (!dbRes.rows || dbRes.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado en BD' }, { status: 404 });
    }

    const product = dbRes.rows[0];

    // 3. Extraer nombre localizado del JSONB 'marketing_copy'
    // Asumiendo la estructura: { localizedProductName: "...", ... }
    const productName = product.marketing_copy?.localizedProductName || 'Producto Aether Trade';
    const unitPrice = parseFloat(product.suggested_price_local);
    const country = product.target_country; // 'CL', 'MX', 'BR'

    // 4. Configurar moneda según el país de destino
    const currency = country === 'CL' ? 'CLP' : (country === 'MX' ? 'MXN' : 'BRL');

    // 5. Crear la preferencia en Mercado Pago
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
        // El webhook que procesará la compra y alimentará el Dashboard de Angular
        notification_url: `${process.env.API_WEBHOOK_URL}/webhooks/mercadopago`,
        statement_descriptor: "AETHER TRADE",
        external_reference: product.id // Para vincularlo en el webhook
      }
    });

    // 6. Retornar el punto de inicio para la redirección
    return NextResponse.json({ init_point: mpResponse.init_point });

  } catch (error: any) {
    console.error('🚨 Error en Checkout MP:', error.message);
    return NextResponse.json(
      { error: 'Error al procesar el pago', detail: error.message }, 
      { status: 500 }
    );
  }
}