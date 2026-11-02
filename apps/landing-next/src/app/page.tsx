// src/app/page.tsx
export const revalidate = 30; 
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TrustSection from '@/components/TrustSection';
import ProductGridClient from '@/components/ProductGridClient';
import ProductCarousel from '@/components/ProductCarousel';
import ImmediateDeliverySection from '@/components/ImmediateDeliverySection';
import StorefrontHero from '@/components/StorefrontHero';
import { HowItWorks } from '@/components/ui/HowItWorks';
import { Warranty } from '@/components/ui/Warranty';
import { processProductPricing } from '@/lib/api'; 

const countryConfigs: Record<string, { name: string; flag: string; accent: string }> = {
  CL: { name: 'Chile', flag: '🇨🇱', accent: 'from-blue-500 to-red-500' },
  US: { name: 'USA', flag: '🇺🇸', accent: 'from-blue-600 to-red-600' },
  CA: { name: 'Canadá', flag: '🇨🇦', accent: 'from-red-500 to-red-700' },
  ES: { name: 'España', flag: '🇪🇸', accent: 'from-yellow-500 to-red-500' }
};

async function getWinners(countryCode: string) {
  try {
    const API_URL = process.env.API_GATEWAY_URL;
    const res = await fetch(`${API_URL}/api/inventory?status=WINNER&country=${countryCode}`, {
      next: { revalidate: 30 }
    });

    if (!res.ok) throw new Error('Error al conectar con API Gateway');
    
    let products = await res.json();

    if (products.length === 0 && countryCode !== 'CL') {
      const fallbackRes = await fetch(`${API_URL}/api/inventory?status=WINNER&country=CL`);
      products = await fallbackRes.json();
    }

    return products.map(processProductPricing);
  } catch (error) {
    console.error("❌ Error consumiendo API Gateway en Page:", error);
    return [];
  }
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const countryCode = (cookieStore.get('user-country')?.value || 'CL').toUpperCase();
  const config = countryConfigs[countryCode] || countryConfigs.CL;

  const products = await getWinners(countryCode);

  // ============================================================================
  // ⚡ LÓGICA DE DISTRIBUCIÓN ESTRICTA Y FILTRO DE DENSIDAD
  // ============================================================================
  
  const getCatName = (p: any) => p.category_name || (p.category && p.category.name) || (typeof p.category === 'string' ? p.category : null) || 'Otras Novedades';
  
  // 1. Agrupar productos por categoría y contar cuántos hay en cada una
  const categoryCounts: Record<string, any[]> = {};
  products.forEach((p: any) => {
    const cat = getCatName(p);
    if (!categoryCounts[cat]) categoryCounts[cat] = [];
    categoryCounts[cat].push(p);
  });

  // 2. Ordenar categorías por volumen (las que tienen más productos van primero)
  const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b].length - categoryCounts[a].length);

  // 3. Exactamente las primeras 10 para la barra de navegación (Grid Principal)
  const top10Categories = sortedCategories.slice(0, 10);
  const mainGridProducts = products.filter((p: any) => top10Categories.includes(getCatName(p)));

 // 4. Lógica de Densidad para los carruseles inferiores (De la categoría 11 en adelante)
  const remainingCategories = sortedCategories.slice(10);
  
  const denseCarousels: { categoryName: string; products: any[] }[] = [];
  const sparseProducts: any[] = [];

  remainingCategories.forEach(catName => {
    const catProducts = categoryCounts[catName];
    // ⚡ Corrección: Exigimos mínimo 5 productos para fila exclusiva, según requerimiento
    if (catProducts.length >= 5) {
      denseCarousels.push({
        categoryName: catName,
        // ⚡ UX Guardrail: Topamos la fila exclusiva a 10 para mantener consistencia
        products: catProducts.slice(0, 10) 
      });
    } else {
      // Si tiene 4 o menos, la sacamos de su fila individual y la mezclamos
      sparseProducts.push(...catProducts);
    }
  });

  // 5. ⚡ Lógica de Fragmentación (Chunking) para evitar carruseles eternos
  if (sparseProducts.length > 0) {
    const MAX_ITEMS_PER_CAROUSEL = 10;
    
    // Dividimos el Mega-Array en fragmentos de máximo 10 productos
    for (let i = 0; i < sparseProducts.length; i += MAX_ITEMS_PER_CAROUSEL) {
      const chunk = sparseProducts.slice(i, i + MAX_ITEMS_PER_CAROUSEL);
      
      // Asignamos un título dinámico para evitar repetir exactamente el mismo texto
      const chunkNumber = Math.floor(i / MAX_ITEMS_PER_CAROUSEL) + 1;
      const carouselTitle = chunkNumber === 1 
        ? 'Descubre Más Novedades' 
        : `Explora Más Novedades ${chunkNumber}`;

      denseCarousels.push({
        categoryName: carouselTitle,
        products: chunk
      });
    }
  }

  const carouselsData = denseCarousels;

  return (
    <div className="storefront-shell min-h-screen bg-[#020617] text-white selection:bg-violet-500/30 scroll-smooth overflow-x-hidden">
      <Navbar countryCode={countryCode} />
      
      <main className="pt-36 md:pt-32">
        <StorefrontHero countryName={config.name} />

        <ImmediateDeliverySection />

        <section id="tendencias" className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">
              Recomendados
            </h2>
            <span className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
              Top Destacados
            </span>
          </div>
          
          <ProductGridClient 
            products={mainGridProducts} 
            categoriesList={top10Categories} 
            countryCode={countryCode} 
          />
        </section>

        {/* ⚡ Renderizamos los carruseles dinámicos (densos + el consolidado de descubrimientos) */}
        {carouselsData.length > 0 && (
          <section className="flex flex-col gap-8 md:gap-10 pb-16">
            {carouselsData.map((carousel) => (
              <ProductCarousel 
                key={carousel.categoryName} 
                title={carousel.categoryName} 
                products={carousel.products} 
              />
            ))}
          </section>
        )}
        <TrustSection countryCode={countryCode} />

        <HowItWorks />
        <Warranty />
      </main>

      <Footer countryCode={countryCode} />
    </div>
  );
}