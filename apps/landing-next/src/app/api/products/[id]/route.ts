import { NextResponse } from 'next/server';
import { pool } from '@/lib/db'; 

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // Unwrapping params for Next.js 15
    
    const query = `
      SELECT 
        id, title_original, image_url, 
        video_url,         -- <--- Requerido para el visor
        local_images, 
        marketing_copy,    -- <--- Requerido para el español
        suggested_price_local, 
        target_country 
      FROM products WHERE id = $1
    `;
    
    const res = await pool.query(query, [id]);

    if (!res.rows || res.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('🚨 Error en API de producto:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}