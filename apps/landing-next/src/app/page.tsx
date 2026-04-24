// apps/landing-next/src/app/page.tsx
import { pool } from '@/lib/db';
import { headers } from 'next/headers';
import { 
  Zap, ShoppingBag, ShieldCheck, Truck, 
  CreditCard, Star, Plus, Globe, Activity, Search 
} from 'lucide-react';

async function getWinners() {
  try {
    // Filtro: Solo ganadores analizados con stock real disponible
    const res = await pool.query(
      "SELECT * FROM products WHERE status = 'WINNER' AND stock_quantity > 0 ORDER BY created_at DESC"
    );
    return res.rows;
  } catch (error) {
    console.error("❌ Error fetch DB:", error);
    return [];
  }
}

const formatPrice = (amount: number, countryCode: string) => {
  const config: Record<string, { locale: string; currency: string }> = {
    CL: { locale: 'es-CL', currency: 'CLP' },
    US: { locale: 'en-US', currency: 'USD' },
  };
  const { locale, currency } = config[countryCode] || config.CL;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};

// --- COMPONENTES DE AUTORIDAD ---

const TechMetrics = () => (
  <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-20">
    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2rem] min-w-[220px] backdrop-blur-md shadow-xl">
      <div className="flex items-center gap-3 mb-2 text-violet-400">
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Escaneo de Mercado</span>
      </div>
      <div className="text-4xl font-black text-white tracking-tighter">1,248</div>
      <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tight">Oportunidades analizadas hoy</p>
    </div>

    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2rem] min-w-[220px] backdrop-blur-md shadow-xl">
      <div className="flex items-center gap-3 mb-2 text-emerald-400">
        <Activity className="w-4 h-4 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Gestión de Stock</span>
      </div>
      <div className="text-xl font-black text-white uppercase tracking-tight">Sincronización Global</div>
      <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-tight">Verificación en tiempo real</p>
    </div>
  </div>
);

const ProductCard = ({ product, countryCode }: { product: any, countryCode: string }) => (
  <div className="group bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-violet-500/50 transition-all duration-500 flex flex-col h-full shadow-2xl">
    <div className="relative aspect-square overflow-hidden">
      <img 
        src={product.image_url || 'https://via.placeholder.com/400x400'} 
        alt={product.title_original} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
      />
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-widest flex items-center gap-1">
          <Truck className="w-3 h-3" /> Envío Gratis Chile
        </div>
        <div className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 uppercase">
          Disponibles: {product.stock_quantity} unidades
        </div>
      </div>
    </div>
    
    <div className="p-8 flex flex-col flex-1">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
        <span className="text-[9px] text-slate-500 font-black ml-2 uppercase tracking-tighter">Calidad Seleccionada</span>
      </div>

      <h3 className="text-white font-bold text-xl line-clamp-2 mb-8 min-h-[3.5rem] leading-tight group-hover:text-violet-400 transition-colors">
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
          <button className="bg-white hover:bg-violet-500 text-black hover:text-white h-16 w-16 rounded-[1.25rem] flex items-center justify-center transition-all flex-shrink-0 active:scale-95 shadow-xl">
            <Plus className="w-8 h-8" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800/50">
           <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-4 grayscale brightness-200 opacity-40" alt="Webpay" />
           <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter italic">6 Cuotas Sin Interés</span>
        </div>
      </div>
    </div>
  </div>
);

export default async function Home() {
  const headerList = await headers(); // Fix Next.js 15+
  const countryCode = headerList.get('x-vercel-ip-country') || 'CL';
  const products = await getWinners();

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500">
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-violet-500 w-6 h-6 fill-current" />
            <span className="text-2xl font-black tracking-tighter uppercase">Ravstore</span>
          </div>
          <button className="bg-violet-600 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-600/20">
            Ver Carrito (0)
          </button>
        </div>
      </nav>

      <main className="pt-40 pb-20">
        <header className="container mx-auto px-6 text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.85] tracking-tighter">
            CALIDAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500 uppercase tracking-tighter">Premium</span> <br />
            PRECIOS LOCALES
          </h1>
          <p className="text-slate-400 text-xl max-w-xl mx-auto font-medium leading-relaxed">
            Las últimas tendencias tecnológicas internacionales, seleccionadas por nuestra IA y respaldadas localmente desde la Región del Biobío.
          </p>
        </header>

        <TechMetrics />

        <section className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.length > 0 ? (
              products.map((p) => <ProductCard key={p.id} product={p} countryCode={countryCode} />)
            ) : (
              <div className="col-span-full py-40 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20">
                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Validando Inventario Global...</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Nuestro motor está verificando la disponibilidad actual de los ganadores detectados. Vuelve en instantes.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}