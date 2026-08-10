import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Extraemos los parámetros de la URL que envió el Navbar
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const country = searchParams.get('country');

  // AQUÍ SÍ FUNCIONA leer la variable de entorno de Cloud Run en tiempo de ejecución
  const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080';

  try {
    // Hacemos la petición real al Gateway desde el servidor
    const res = await fetch(`${API_URL}/api/search?q=${q}&country=${country}`);
    const data = await res.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching search results' }, { status: 500 });
  }
}