// src/lib/api.ts
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

  const exchangeRate = Number(product.rate_to_usd) || 940;
  const baseSuggested = Number(product.suggested_price_local) || 0;
  const baseCostUsd = Number(product.base_cost_usd) || 0; 

  let minVariantPrice = Infinity;

  // 1. RECORRER VARIANTES: Cálculo inteligente y rescate de precios reales
  if (product.variants && product.variants.length > 0) {
    
    // ⚡ FIX ANTIDOTO: Creamos un mapa leyendo el JSON original para rescatar el promotionPrice real
    const rawVariants = product.raw_details?.sku?.base || [];
    const realPriceMap = new Map();
    rawVariants.forEach((rv: any) => {
      realPriceMap.set(rv.skuId, Number(rv.promotionPrice || rv.price || 0));
    });

    product.variants = product.variants.map((v: any) => {
      // ⚡ Usamos el precio del mapa rescatado, si no existe caemos en la DB
      const variantCostUsd = realPriceMap.get(v.ali_sku_id) || Number(v.additional_cost_usd) || 0;

      if (variantCostUsd > baseCostUsd) {
        // Hay un costo adicional real para esta variante
        const extraCostUsd = variantCostUsd - baseCostUsd;
        const extraCostLocal = extraCostUsd * exchangeRate * 1.19; // Convertimos sumando el IVA
        v.calculated_price_local = getPsychologicalPrice(baseSuggested + extraCostLocal);
      } else {
        // Cuesta lo mismo o menos, usamos el precio sugerido intacto
        v.calculated_price_local = getPsychologicalPrice(baseSuggested);
      }

      if (v.calculated_price_local > 0 && v.calculated_price_local < minVariantPrice) {
        minVariantPrice = v.calculated_price_local;
      }

      return v;
    });
  }

  // 2. PUBLICAR EN PORTADA EL MENOR PRECIO
  if (minVariantPrice !== Infinity && minVariantPrice > 0) {
    product.calculated_min_price = minVariantPrice;
  } else {
    product.calculated_min_price = getPsychologicalPrice(baseSuggested); 
  }

  // 3. PRECIO TACHADO Y DESCUENTO
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

  // 4. LÓGICA DE ENTREGA DINÁMICA
  const today = new Date();
  const transitDays = Number(product.estimated_transit_days) || 15;
  const minDays = Math.max(1, transitDays - 3); 
  const maxDays = transitDays + 4; 

  const minDate = new Date(today);
  minDate.setDate(today.getDate() + minDays);

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxDays);

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  product.calculated_estimated_delivery = `${minDate.toLocaleDateString('es-CL', options)} - ${maxDate.toLocaleDateString('es-CL', options)}`;

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