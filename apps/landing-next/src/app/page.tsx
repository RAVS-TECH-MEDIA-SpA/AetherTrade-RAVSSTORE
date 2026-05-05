export const revalidate = 30; 
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TrustSection from '@/components/TrustSection';
import ProductGridClient from '@/components/ProductGridClient';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import dotenv from 'dotenv';


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const countryConfigs: Record<string, { name: string; flag: string; accent: string }> = {
  CL: { name: 'Chile', flag: '🇨🇱', accent: 'from-blue-500 to-red-500' },
  US: { name: 'USA', flag: '🇺🇸', accent: 'from-blue-600 to-red-600' },
  CA: { name: 'Canadá', flag: '🇨🇦', accent: 'from-red-500 to-red-700' },
  ES: { name: 'España', flag: '🇪🇸', accent: 'from-yellow-500 to-red-500' }
};

/**
 * Lógica de Servidor: Ahora consume de la API Gateway
 */
async function getWinners(countryCode: string) {
  try {
    const API_URL = process.env.API_GATEWAY_URL;
    // Llamamos al endpoint de inventario filtrando por status y país
    console.log("API_URL", API_URL);

    const res = await fetch(`${API_URL}/api/inventory?status=WINNER&country=${countryCode}`, {
      next: { revalidate: 30 }
    });

    if (!res.ok) throw new Error('Error al conectar con API Gateway');
    
    let products = await res.json();

    // Fallback: Si no hay productos para el país detectado, pedimos los de Chile a la Gateway
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

  // 2. Obtener datos desde la API Gateway
  const products = await getWinners(countryCode);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
      <Navbar countryCode={countryCode} />
      <main>
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
        <TrustSection countryCode={countryCode} />
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
      <Footer countryCode={countryCode} />
    </div>
  );
}