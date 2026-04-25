import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';        // Sin llaves { }
import Footer from '@/components/Footer';        // Sin llaves { }
import TrustSection from '@/components/TrustSection'; // Sin llaves { }
import ProductGridClient from '@/components/ProductGridClient';

const countryConfigs: Record<string, { name: string; flag: string; accent: string }> = {
  CL: { name: 'Chile', flag: 'cl', accent: 'from-blue-500 to-red-500' },
  US: { name: 'USA', flag: 'us', accent: 'from-blue-600 to-red-600' },
  CA: { name: 'Canadá', flag: 'ca', accent: 'from-red-500 to-red-700' },
  ES: { name: 'España', flag: 'es', accent: 'from-yellow-500 to-red-500' }
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const countryCode = (cookieStore.get('user-country')?.value || 'CL').toUpperCase();
  const config = countryConfigs[countryCode] || countryConfigs.CL;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  let products = [];
  try {
    const res = await fetch(`${baseUrl}/api/products?country=${countryCode}`, { cache: 'no-store' });
    if (res.ok) products = await res.json();
    
    if (products.length === 0 && countryCode !== 'CL') {
      const backup = await fetch(`${baseUrl}/api/products?country=CL`, { cache: 'no-store' });
      if (backup.ok) products = await backup.json();
    }
  } catch (e) {
    console.error("❌ Error de red en Landing:", e);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
      {/* 1. Barra de Navegación */}
      <Navbar countryCode={countryCode} />

      <main>
        {/* 2. Hero Dinámico (Inyectado directamente para máxima velocidad) */}
        <section className="relative pt-40 pb-24 px-6 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 backdrop-blur-md px-4 py-2 rounded-full mb-8 shadow-2xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Stock Optimizado para {config.name}
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]">
              OFERTAS EXCLUSIVAS <br />
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${config.accent}`}>
                PARA {config.name.toUpperCase()} {config.flag}
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium leading-relaxed mb-12">
              Seleccionamos los <span className="text-white italic">Winners</span> más virales del mercado global y los ponemos en tu puerta con precios locales.
            </p>
          </div>
        </section>

        {/* 3. Sección de Confianza (Garantías, envíos, etc.) */}
        <TrustSection countryCode={countryCode} />

        {/* 4. Grid de Productos */}
        <section className="container mx-auto px-6 py-24">
          <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Top Winners</h2>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                Tendencia actual en {config.name}
              </p>
            </div>
            <div className="px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
              <span className="text-violet-400 font-black text-sm uppercase">
                {products.length} Resultados Encontrados
              </span>
            </div>
          </div>

          <ProductGridClient products={products} countryCode={countryCode} />
        </section>
      </main>

      {/* 5. Pie de página */}
      <Footer countryCode={countryCode} />
    </div>
  );
}