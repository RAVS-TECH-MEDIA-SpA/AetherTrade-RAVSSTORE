// src/lib/api.ts
// const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';
export const API_URL = 
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://aethertrade-gateway-126152513656.southamerica-west1.run.app' 
    : 'http://localhost:8080');

export function processProductPricing(product: any) {
  if (!product) return null;

  const getPsychologicalPrice = (price: number) => {
    if (!price || price <= 0) return 0;
    return Math.ceil(price / 100) * 100 - 10;
  };

  // Usamos el dólar configurado en la BD (o 930 de fallback)
  const exchangeRate = Number(product.rate_to_usd) || 930;
  const baseSuggested = Number(product.suggested_price_local) || 0;

  let minVariantPrice = Infinity;

  // 1. RECORRER VARIANTES: Conversión directa y búsqueda del menor
  if (product.variants && product.variants.length > 0) {
    product.variants = product.variants.map((v: any) => {
      const costUsd = Number(v.additional_cost_usd) || 0;
      
      if (costUsd > 0) {
        // CÁLCULO ESTRICTO: Solo USD * Tasa de cambio
        v.calculated_price_local = getPsychologicalPrice(costUsd * exchangeRate);
      } else {
        v.calculated_price_local = baseSuggested;
      }

      // Rastrear cuál es el precio menor
      if (v.calculated_price_local > 0 && v.calculated_price_local < minVariantPrice) {
        minVariantPrice = v.calculated_price_local;
      }

      return v;
    });
  }

  // 2. PUBLICAR EN PORTADA EL MENOR PRECIO ENCONTRADO
  if (minVariantPrice !== Infinity && minVariantPrice > 0) {
    product.calculated_min_price = minVariantPrice;
  } else {
    // Si no hay variantes, usa el precio base
    product.calculated_min_price = baseSuggested; 
  }

  // 3. PRECIO TACHADO Y DESCUENTO (Generado visualmente en base al precio real)
  const comparePrice = Number(product.compare_at_price) || 0;
  if (comparePrice > product.calculated_min_price && product.calculated_min_price > 0) {
    product.calculated_old_price = comparePrice;
  } else if (product.calculated_min_price > 0) {
    product.calculated_old_price = getPsychologicalPrice(product.calculated_min_price * 1.45);
  } else {
    product.calculated_old_price = 0;
  }
  
  if (product.calculated_old_price > product.calculated_min_price && product.calculated_old_price > 0) {
    product.calculated_discount_percent = Math.round(((product.calculated_old_price - product.calculated_min_price) / product.calculated_old_price) * 100);
  } else {
    product.calculated_discount_percent = 0;
  }

  // 4. LÓGICA DE ENTREGA DINÁMICA (Calculada al vuelo según el tránsito de la BD)
  const today = new Date();
  
  // Leemos los días calculados por el Worker (o usamos 15 de fallback)
  const transitDays = Number(product.estimated_transit_days) || 15;
  
  // Rango inteligente (min -3 días optimista, max +4 días conservador por aduanas/fines de semana)
  const minDays = Math.max(1, transitDays - 3); 
  const maxDays = transitDays + 4; 

  const minDate = new Date(today);
  minDate.setDate(today.getDate() + minDays);

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxDays);

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const formattedMin = minDate.toLocaleDateString('es-CL', options);
  const formattedMax = maxDate.toLocaleDateString('es-CL', options);

  // Inyectamos la fecha proyectada limpia
  product.calculated_estimated_delivery = `${formattedMin} - ${formattedMax}`;

  return product;
}

export async function getProductByAliId(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return processProductPricing(data); 
  } catch (error) {
    return null;
  }
}

export async function getProductsByCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/categories/${slug}/products`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(processProductPricing); 
  } catch (error) {
    return [];
  }
}