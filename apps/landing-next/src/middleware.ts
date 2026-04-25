import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar archivos estáticos y API
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Detectar país (Vercel/Cloudflare headers)
  const country = request.headers.get('x-vercel-ip-country') || 
                  request.headers.get('cf-ipcountry') || 
                  'CL';

  const cookieStore = request.cookies.get('user-country');

  // 3. Si no hay cookie, la seteamos y recargamos
  if (!cookieStore) {
    const response = NextResponse.next();
    response.cookies.set('user-country', country, { 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7 // 1 semana
    });
    return response;
  }

  return NextResponse.next();
}

// Solo aplicar en la home
export const config = {
  matcher: '/',
};