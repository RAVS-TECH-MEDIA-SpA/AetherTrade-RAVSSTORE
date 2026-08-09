// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

// ⚡ MOTOR DE PRECIOS LIMPIO Y DIRECTO (Basado en costos absolutos reales de la BD)
export function processProductPricing(product: any) {
  if (!product) return null;

  const getPsychologicalPrice = (price: number) => {
    if (!price) return 0;
    return Math.ceil(price / 100) * 100 - 10;
  };

  const exchangeRate = Number(product.rate_to_usd) || 950;
  const markup = 1.8; // Factor comercial estándar para cubrir pasarela, envíos y márgenes
  const baseSuggested = Number(product.suggested_price_local) || 0;

  let minPrice = Infinity;

  // 1. Procesar cada variante usando su costo absoluto en USD de forma directa
  if (product.variants && product.variants.length > 0) {
    product.variants = product.variants.map((v: any) => {
      const costUsd = Number(v.additional_cost_usd) || 0;
      
      // Fórmula directa: Costo USD de la variante * Tipo de Cambio * Markup
      let rawPrice = costUsd > 0 ? (costUsd * exchangeRate * markup) : (baseSuggested || 10000);

      // Red de seguridad: Nunca vender por debajo de su costo en dólares + 20%
      const absoluteMin = costUsd > 0 ? (costUsd * exchangeRate * 1.2) : (baseSuggested * 0.5);
      if (rawPrice < absoluteMin) {
        rawPrice = absoluteMin;
      }

      v.calculated_price_local = getPsychologicalPrice(rawPrice);

      if (v.calculated_price_local < minPrice) {
        minPrice = v.calculated_price_local;
      }

      return v;
    });
  }

  // 2. Si no hay variantes, usamos el precio sugerido base
  if (minPrice === Infinity) {
    const baseCost = Number(product.base_cost_usd) || 0;
    const baseRaw = baseCost > 0 ? (baseCost * exchangeRate * markup) : (baseSuggested || 15000);
    minPrice = getPsychologicalPrice(baseRaw);
  }

  product.calculated_min_price = minPrice;

  const rawOldPrice = product.compare_at_price ? Number(product.compare_at_price) : (minPrice * 1.45);
  product.calculated_old_price = getPsychologicalPrice(rawOldPrice);
  
  if (product.calculated_old_price > product.calculated_min_price) {
    product.calculated_discount_percent = Math.round(((product.calculated_old_price - product.calculated_min_price) / product.calculated_old_price) * 100);
  } else {
    product.calculated_discount_percent = 0;
  }

  return product;
}

export async function getProductByAliId(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return processProductPricing(data); 
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  }
}

export async function getProductsByCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/categories/${slug}/products`, {
      next: { revalidate: 1800 } 
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(processProductPricing); 
  } catch (error) {
    console.error("Error fetching category products:", error);
    return [];
  }
}