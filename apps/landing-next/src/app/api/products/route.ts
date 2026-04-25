import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Forzamos que no sea estático para que siempre consulte la DB
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.toUpperCase() || 'CL';

  console.log(`📡 API: Consultando productos para el país: ${country}`);

  try {
    const res = await pool.query(
      `SELECT id, title_original, marketing_copy, suggested_price_local, local_images, target_country 
       FROM products 
       WHERE status = 'WINNER' AND target_country = $1 
       ORDER BY updated_at DESC`,
      [country]
    );

    console.log(`✅ API: Se encontraron ${res.rows.length} productos.`);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('❌ Error en API Products:', error.message);
    return NextResponse.json({ error: 'DB_ERROR', details: error.message }, { status: 500 });
  }
}