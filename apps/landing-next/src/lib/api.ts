// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

export async function getProductByAliId(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  }
}

export async function getProductsByCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/categories/${slug}/products`, {
      next: { revalidate: 1800 } // Cache de 30 min
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching category products:", error);
    return [];
  }
}