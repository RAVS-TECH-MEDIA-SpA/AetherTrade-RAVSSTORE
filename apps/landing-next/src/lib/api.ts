// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

// ⚡ NUEVO: Función centralizada de cálculo de precios y redondeo
// Esta función garantiza que la Portada, el Detalle y el Checkout usen exactamente la misma matemática.
export function processProductPricing(product: any) {
  if (!product) return null;

  const getPsychologicalPrice = (price: number) => {
    if (!price) return 0;
    return Math.ceil(price / 100) * 100 - 10;
  };

  const baseSellingPrice = Number(product.suggested_price_local) || 0;
  const baseCostUsd = Number(product.base_cost_usd) || 0;
  const exchangeRate = Number(product.rate_to_usd) || 950;

  let minVariantCostUsd = baseCostUsd;

  // 1. Calcular el precio exacto y seguro de cada variante
  if (product.variants && product.variants.length > 0) {
    product.variants = product.variants.map((v: any) => {
      const variantCostUsd = Number(v.additional_cost_usd);
      let rawVariantPrice = baseSellingPrice;

      // Cálculo Diferencial Neto
      if (baseCostUsd > 0 && variantCostUsd > 0) {
        const costDiffUsd = variantCostUsd - baseCostUsd;
        const diffClp = costDiffUsd * exchangeRate * 1.5; // Margen para impuestos/pasarela
        rawVariantPrice = baseSellingPrice + diffClp;

        if (variantCostUsd < minVariantCostUsd) minVariantCostUsd = variantCostUsd;
      } else if (variantCostUsd > 0 && !baseCostUsd) {
        const estimatedCostClp = variantCostUsd * exchangeRate;
        if (estimatedCostClp > baseSellingPrice) {
          rawVariantPrice = estimatedCostClp * 1.8;
        }
        if (variantCostUsd < minVariantCostUsd) minVariantCostUsd = variantCostUsd;
      }

      const absoluteMin = variantCostUsd * exchangeRate * 1.2;
      if (rawVariantPrice < absoluteMin) rawVariantPrice = absoluteMin;

      // Inyectamos el precio final redondeado directamente en el objeto de la variante
      v.calculated_price_local = getPsychologicalPrice(rawVariantPrice);
      return v;
    });
  }

  // 2. Calcular el precio "Desde" (mínimo) para la Portada
  let minSellingPrice = baseSellingPrice;
  if (minVariantCostUsd > 0 && minVariantCostUsd < baseCostUsd) {
    const costDiffUsd = baseCostUsd - minVariantCostUsd;
    const diffClp = costDiffUsd * exchangeRate * 1.5;
    minSellingPrice = baseSellingPrice - diffClp;
  }

  // Inyectamos los precios de portada ya masticados
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
    
    // ⚡ Filtramos la data cruda con nuestra matemática antes de entregarla a la landing
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