// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

// ⚡ MOTOR DE PRECIOS CENTRALIZADO (Corregido con Proporción de Costos Absolutos)
export function processProductPricing(product: any) {
  if (!product) return null;

  const getPsychologicalPrice = (price: number) => {
    if (!price) return 0;
    return Math.ceil(price / 100) * 100 - 10;
  };

  const baseSellingPrice = Number(product.suggested_price_local) || 0;
  const baseCostUsd = Number(product.base_cost_usd) || 0;
  const exchangeRate = Number(product.rate_to_usd) || 950;

  let minVariantCostUsd = baseCostUsd > 0 ? baseCostUsd : 999999;

  // 1. Calcular el precio proporcional de cada variante
  if (product.variants && product.variants.length > 0) {
    product.variants = product.variants.map((v: any) => {
      const variantCostUsd = Number(v.additional_cost_usd) || 0;
      let rawVariantPrice = baseSellingPrice;

      // Aplicamos la proporción real basada en el costo absoluto de AliExpress
      if (baseCostUsd > 0 && variantCostUsd > 0) {
        const costRatio = variantCostUsd / baseCostUsd;
        rawVariantPrice = baseSellingPrice * costRatio;

        if (variantCostUsd < minVariantCostUsd) {
          minVariantCostUsd = variantCostUsd;
        }
      } else if (variantCostUsd > 0 && baseCostUsd === 0) {
        // Fallback si no hay costo base
        rawVariantPrice = variantCostUsd * exchangeRate * 1.6;
        if (variantCostUsd < minVariantCostUsd) {
          minVariantCostUsd = variantCostUsd;
        }
      }

      // Red de seguridad: Nunca vender por debajo del costo + 20%
      const absoluteMin = variantCostUsd > 0 ? (variantCostUsd * exchangeRate * 1.2) : (baseSellingPrice * 0.5);
      if (rawVariantPrice < absoluteMin) {
        rawVariantPrice = absoluteMin;
      }

      v.calculated_price_local = getPsychologicalPrice(rawVariantPrice);
      return v;
    });
  }

  if (minVariantCostUsd === 999999) {
    minVariantCostUsd = baseCostUsd;
  }

  // 2. Calcular el precio "Desde" (mínimo) para la Portada de forma proporcional
  let minSellingPrice = baseSellingPrice;
  if (baseCostUsd > 0 && minVariantCostUsd > 0 && minVariantCostUsd !== baseCostUsd) {
    const ratio = minVariantCostUsd / baseCostUsd;
    minSellingPrice = baseSellingPrice * ratio;
  }

  product.calculated_min_price = getPsychologicalPrice(minSellingPrice);

  const rawOldPrice = product.compare_at_price ? Number(product.compare_at_price) : (minSellingPrice * 1.45);
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