import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ravstore.vercel.app';
  const API_URL = process.env.API_GATEWAY_URL;

  // 1. Páginas Estáticas
  const routes = [
    '',
    '/terminos',
    '/privacidad',
    '/soporte',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // 2. Páginas Dinámicas (Productos)
  // Obtenemos los IDs de los productos para que Google los indexe uno por uno
  let productRoutes: any[] = [];
  try {
    const res = await fetch(`${API_URL}/api/inventory?status=WINNER`);
    const products = await res.json();
    
    productRoutes = products.map((product: any) => ({
      url: `${baseUrl}/products/${product.aliexpress_id || product.id}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("Error generando sitemap dinámico", e);
  }

  return [...routes, ...productRoutes];
}