// src/app/page.tsx
export const revalidate = 30; 
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TrustSection from '@/components/TrustSection';
import ProductGridClient from '@/components/ProductGridClient';
import { HowItWorks } from '@/components/ui/HowItWorks';
import { Warranty } from '@/components/ui/Warranty';

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

    return products;
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

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30 scroll-smooth">
      <Navbar countryCode={countryCode} />
      
      {/* Ajustamos el padding-top para el nuevo Navbar más robusto */}
      <main className="pt-32 md:pt-36">
        
        {/* NUEVO HERO SECTION: Estilo "Bento Box" de Alta Densidad */}
        <section className="container mx-auto px-4 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            
          {/* Banner Principal (Ocupa 2 columnas en Desktop) */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 md:p-10 flex flex-col justify-center relative overflow-hidden min-h-[220px] md:min-h-[320px] group">
            
            {/* 1. Efecto de luz original */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full z-0" />
            
            {/* 2. TU IMAGEN INTEGRADA AQUÍ */}
            <img 
              src="/assets/photo-1586528116311-ad8dd3c8310d.avif" 
              alt="Importación Directa" 
              className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity z-0 transition-transform duration-700 group-hover:scale-105"
            />

            {/* 3. TU CÓDIGO DE CONTENIDO */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest mb-3">
                🔥 Venta Express
              </div>
              <h1 className="text-2xl md:text-5xl font-black mb-2 tracking-tight leading-none">
                Importación Directa a <br className="hidden md:block"/>
                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${config.accent}`}>{config.name}</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm max-w-md mt-2 mb-6">
                Los productos más virales del mundo, verificados. Precios finales, sin sorpresas aduaneras.
              </p>
              <a href="#tendencias" className="inline-block bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-violet-900/50 hover:scale-105 active:scale-95 text-xs md:text-sm">
                Comprar Ahora
              </a>
            </div>
          </div>

            {/* Banners Secundarios (Slider en móvil, apilados en desktop) */}
        <div className="flex lg:flex-col gap-3 md:gap-4 overflow-x-auto pb-4 lg:pb-0 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden">
          
          {/* Promo 1 */}
          <div className="flex-none w-[85%] sm:w-[45%] lg:w-full snap-center bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-end min-h-[140px] md:min-h-[150px] group hover:border-violet-500/50 transition-colors cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] z-0" />
            
            {/* Imagen Novedades */}
            <img 
              src="/assets/novedades/photo-1505740420928-5e560c06d30e.avif" 
              alt="Novedades Gadgets" 
              className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity z-0 transition-transform duration-700 group-hover:scale-110"
            />
            
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest drop-shadow-md">Novedades</span>
              <h3 className="text-lg md:text-xl font-bold leading-tight mt-1 text-white">Gadgets 2026</h3>
            </div>
          </div>

          {/* Promo 2 */}
          <div className="flex-none w-[85%] sm:w-[45%] lg:w-full snap-center bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-end min-h-[140px] md:min-h-[150px] group hover:border-violet-500/50 transition-colors cursor-pointer">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[50px] z-0" />
            
            {/* Imagen Liquidación */}
            <img 
              src="/assets/liquidacion/photo-1607082348824-0a96f2a4b9da.avif" 
              alt="Liquidación" 
              className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity z-0 transition-transform duration-700 group-hover:scale-110"
            />
            
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest drop-shadow-md">Liquidación</span>
              <h3 className="text-lg md:text-xl font-bold leading-tight mt-1 text-white">Hasta -50% Off</h3>
            </div>
          </div>

          {/* Puedes copiar y pegar más bloques <div> aquí abajo en el futuro y se añadirán automáticamente al slider en móvil */}

        </div>

          </div>
        </section>

        <TrustSection countryCode={countryCode} />

        {/* SECCIÓN TENDENCIAS */}
        <section id="tendencias" className="container mx-auto px-4 py-8 md:py-12">
          {/* El título se mantiene limpio */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">
              Recomendados
            </h2>
            <span className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">
              {products.length} Resultados
            </span>
          </div>
          
          <ProductGridClient products={products} countryCode={countryCode} />
        </section>

        <HowItWorks />
        <Warranty />
      </main>

      <Footer countryCode={countryCode} />
    </div>
  );
}