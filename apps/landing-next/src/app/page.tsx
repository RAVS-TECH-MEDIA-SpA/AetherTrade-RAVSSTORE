// apps/landing-next/src/app/page.tsx
import { pool } from '@/lib/db';
import { headers } from 'next/headers';
import { 
  Zap, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  CreditCard,
  Star,
  Plus,
  Globe
} from 'lucide-react';

// --- LÓGICA DE NEGOCIO Y DATOS ---
async function getWinners(countryCode: string) {
  try {
    // Filtramos por status 'WINNER' y que tengan stock real (> 0)
    const res = await pool.query(
      "SELECT * FROM products WHERE status = 'WINNER' AND stock_quantity > 0 ORDER BY created_at DESC"
    );
    return res.rows;
  } catch (error) {
    console.error("❌ Error fetch DB:", error);
    return [];
  }
}

// --- FORMATEADOR INTERNACIONAL ---
const formatPrice = (amount: number, countryCode: string) => {
  // Mapeo inicial para expansión internacional de Ravstore
  const config: Record<string, { locale: string; currency: string }> = {
    CL: { locale: 'es-CL', currency: 'CLP' },
    US: { locale: 'en-US', currency: 'USD' },
    MX: { locale: 'es-MX', currency: 'MXN' },
    ES: { locale: 'es-ES', currency: 'EUR' },
  };

  const { locale, currency } = config[countryCode] || config.CL;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};

// --- COMPONENTES UI ---

const TrustBanner = () => (
  <section className="container mx-auto px-6 mb-20">
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-[3rem] p-8 md:p-14 grid grid-cols-1 md:grid-cols-3 gap-12">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-violet-600/20 p-4 rounded-2xl text-violet-400"><Globe className="w-8 h-8"/></div>
        <h4 className="font-bold text-lg text-white">Importación Directa</h4>
        <p className="text-slate-400 text-sm leading-relaxed">Traemos tendencias globales directo a tu hogar, sin intermediarios.</p>
      </div>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-violet-600/20 p-4 rounded-2xl text-violet-400"><Truck className="w-8 h-8"/></div>
        <h4 className="font-bold text-lg text-white">Envío Gratis</h4>
        <p className="text-slate-400 text-sm leading-relaxed">Disfruta de logística internacional premium con costo cero para ti.</p>
      </div>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-violet-600/20 p-4 rounded-2xl text-violet-400"><ShieldCheck className="w-8 h-8"/></div>
        <h4 className="font-bold text-lg text-white">Garantía Ravstore</h4>
        <p className="text-slate-400 text-sm leading-relaxed">Respaldo total en cada compra. Gestionamos tu post-venta desde el Biobío.</p>
      </div>
    </div>
  </section>
);

const ProductCard = ({ product, countryCode }: { product: any, countryCode: string }) => {
  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-violet-500/50 transition-all duration-500 shadow-2xl flex flex-col h-full">
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.image_url || 'https://via.placeholder.com/400x400'} 
          alt={product.title_original} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-widest flex items-center gap-1">
            <Truck className="w-3 h-3" /> Envío Gratis
          </div>
          <div className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-tighter">
            Stock: {product.stock_quantity} unidades
          </div>
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          ))}
          <span className="text-[10px] text-slate-500 font-bold ml-1 uppercase tracking-widest tracking-tighter">Verificado</span>
        </div>

        <h3 className="text-white font-bold text-xl line-clamp-2 mb-8 min-h-[3.5rem] leading-tight">
          {product.title_original}
        </h3>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Total a Pagar</p>
              <p className="text-3xl md:text-4xl font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">
                {formatPrice(product.suggested_price_local || 0, countryCode)}
              </p>
            </div>
            <button className="bg-white hover:bg-violet-500 text-black hover:text-white h-16 w-16 rounded-[1.25rem] flex items-center justify-center transition-all flex-shrink-0 active:scale-90 shadow-xl">
              <Plus className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800/50">
             <div className="flex gap-3 grayscale brightness-200 opacity-40">
               <img src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" className="h-3 w-auto" alt="Visa" />
               <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo.png" className="h-5 w-auto" alt="MC" />
               <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-5 w-auto" alt="Webpay" />
             </div>
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">6 cuotas sin interés</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default async function Home() {
  // FIX: Headers asíncronos para Next.js 15+
  const headerList = await headers();
  const countryCode = headerList.get('x-vercel-ip-country') || 'CL';
  const products = await getWinners(countryCode);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500">
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-violet-500 w-6 h-6 fill-current" />
            <span className="text-2xl font-black tracking-tighter">RAVSTORE</span>
          </div>
          <button className="bg-violet-600 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-violet-500 transition-all">
            Carrito (0)
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <header className="container mx-auto px-6 text-center mb-24">
          <div className="inline-block bg-violet-600/10 border border-violet-500/20 text-violet-400 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest mb-8">
            Global Arbitrage Engine v1.3
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.85] tracking-tighter">
            CALIDAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">PREMIUM</span> <br />
            PRECIOS LOCALES
          </h1>
          <p className="text-slate-400 text-xl max-w-xl mx-auto font-medium leading-relaxed">
            Los mejores productos del mundo analizados por nuestra IA y respaldados por Ravstore en Chile.
          </p>
        </header>

        <TrustBanner />

        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.length > 0 ? (
              products.map((p) => (
                <ProductCard key={p.id} product={p} countryCode={countryCode} />
              ))
            ) : (
              <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-800 rounded-[3rem]">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Analizando nuevas oportunidades...</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}