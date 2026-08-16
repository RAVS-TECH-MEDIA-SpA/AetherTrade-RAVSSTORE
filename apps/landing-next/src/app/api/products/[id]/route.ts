import { NextResponse } from 'next/server';
import { processProductPricing } from '@/lib/api'; 

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
