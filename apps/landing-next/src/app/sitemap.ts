import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ravsstore.com';
  const API_URL = 
    process.env.API_GATEWAY_URL || 
    process.env.NEXT_PUBLIC_API_GATEWAY_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://aethertrade-gateway-126152513656.southamerica-west1.run.app' 
      : 'http://localhost:8080');

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
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    const products = await res.json();
    
    productRoutes = (Array.isArray(products) ? products : []).map((product: any) => ({
      url: `${baseUrl}/products/${product.aliexpress_id || product.id}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.warn("Aviso: No se pudo conectar al API Gateway durante el build del sitemap dinámico. Se omitirán las rutas dinámicas temporalmente.", e);
  }

  return [...routes, ...productRoutes];
}