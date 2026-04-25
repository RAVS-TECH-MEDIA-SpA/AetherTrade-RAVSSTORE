import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } // Crucial para Next.js 15
) {
  const { id } = await params; 

  try {
    const res = await pool.query(
      `SELECT 
        id, 
        marketing_copy, 
        suggested_price_local, 
        ai_verdict, 
        local_images,
        serper_images,
        competitor_data->'result'->'item'->'images' as gallery
       FROM products 
       WHERE id = $1`, 
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    console.error('❌ Error en detalle de producto:', e.message);
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }
}