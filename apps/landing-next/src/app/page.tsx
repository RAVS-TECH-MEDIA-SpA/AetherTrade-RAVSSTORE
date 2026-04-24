import { pool } from '@/lib/db';
import { headers } from 'next/headers';
import { 
  Zap, ShoppingBag, ShieldCheck, Truck, 
  CreditCard, Star, Plus, Globe, Activity, Search,
  ChevronRight, Mail, 
} from 'lucide-react';

// --- LÓGICA DE DATOS (SEO & STOCK) ---
async function getWinners() {
  try {
    // Filtro de seguridad: Solo productos analizados con stock real
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
    MX: { locale: 'es-MX', currency: 'MXN' },
  };
  const { locale, currency } = config[countryCode] || config.CL;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};

// --- COMPONENTES UI DE ALTO IMPACTO ---

const ImpactDashboard = () => (
  <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2.5rem] min-w-[240px] backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-2 text-violet-400">
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Escaneo Global IA</span>
      </div>
      <div className="text-4xl font-black text-white tracking-tighter">1,248</div>
      <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">Productos procesados hoy</p>
    </div>

    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-[2.5rem] min-w-[240px] backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-2 text-emerald-400">
        <Activity className="w-4 h-4 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Validación de Stock</span>
      </div>
      <div className="text-xl font-black text-white uppercase tracking-tight">Sincronización Activa</div>
      <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">Verificado sin intermediarios</p>
    </div>
  </div>
);

const TrustSection = () => (
  <section className="container mx-auto px-6 mb-24">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gradient-to-b from-slate-900/50 to-transparent border border-slate-800/60 p-10 md:p-16 rounded-[4rem]">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-violet-600/20 p-4 rounded-2xl text-violet-400"><Globe className="w-8 h-8"/></div>
        <h2 className="font-bold text-xl text-white tracking-tight">Importación Directa</h2>
        <p className="text-slate-400 text-sm leading-relaxed">Acceso exclusivo a fábricas globales. Traemos lo que es tendencia antes que nadie en Chile.</p>
      </div>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-violet-600/20 p-4 rounded-2xl text-violet-400"><Truck className="w-8 h-8"/></div>
        <h2 className="font-bold text-xl text-white tracking-tight">Envío Gratis Asegurado</h2>
        <p className="text-slate-400 text-sm leading-relaxed">Logística internacional optimizada para que no pagues ni un peso extra por tu despacho.</p>
      </div>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="bg-violet-600/20 p-4 rounded-2xl text-violet-400"><ShieldCheck className="w-8 h-8"/></div>
        <h2 className="font-bold text-xl text-white tracking-tight">Respaldo Local</h2>
        <p className="text-slate-400 text-sm leading-relaxed">Operamos desde la Región del Biobío. Soporte humano y gestión de garantías en tu idioma.</p>
      </div>
    </div>
  </section>
);

const ProductCard = ({ product, countryCode }: { product: any, countryCode: string }) => (
  <article className="group bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden hover:border-violet-500/50 transition-all duration-500 flex flex-col h-full shadow-2xl relative">
    <div className="relative aspect-square overflow-hidden">
      <img 
        src={product.image_url || 'https://via.placeholder.com/400x400'} 
        alt={product.title_original} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" 
      />
      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <div className="bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-widest flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Envío Gratis Chile
        </div>
        <div className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/10 uppercase">
          Stock: {product.stock_quantity} unidades
        </div>
      </div>
    </div>
    
    <div className="p-10 flex flex-col flex-1">
      <div className="flex items-center gap-1.5 mb-5">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
        <span className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-widest">Premium Choice</span>
      </div>

      <h3 className="text-white font-bold text-2xl line-clamp-2 mb-8 min-h-[4rem] leading-tight group-hover:text-violet-400 transition-colors">
        {product.title_original}
      </h3>
      
      <div className="mt-auto">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] mb-2">Total a Pagar</p>
            <p className="text-4xl font-black text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {formatPrice(product.suggested_price_local || 0, countryCode)}
            </p>
          </div>
          <button className="bg-white hover:bg-violet-500 text-black hover:text-white h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all flex-shrink-0 active:scale-90 shadow-2xl shadow-white/5">
            <Plus className="w-8 h-8" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-800/50">
           <div className="flex gap-3 grayscale brightness-200 opacity-30 group-hover:opacity-60 transition-opacity">
             <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-4 w-auto" alt="Webpay" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3 w-auto" alt="Visa" />
           </div>
           <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-tighter italic">6 Cuotas Sin Interés</span>
        </div>
      </div>
    </div>
  </article>
);

// --- PÁGINA PRINCIPAL ---

export default async function Home() {
  const headerList = await headers(); // Fix Next.js 15+
  const countryCode = headerList.get('x-vercel-ip-country') || 'CL';
  const products = await getWinners();

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500">
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-1.5 rounded-lg shadow-lg shadow-violet-600/20">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">Ravstore</span>
          </div>
          <div className="flex items-center gap-6">
             <button className="hidden md:block text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Seguimiento</button>
             <button className="bg-violet-600 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:bg-violet-500 transition-all">
                Carrito (0)
             </button>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-20">
        {/* HERO SEO FRIENDLY */}
        <header className="container mx-auto px-6 text-center mb-24">
          <h1 className="text-7xl md:text-9xl font-black mb-10 leading-[0.8] tracking-tighter">
            CALIDAD <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-600">PREMIUM</span> <br />
            PRECIOS LOCALES
          </h1>
          <p className="text-slate-400 text-xl md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed mb-12">
            Importamos las mejores tendencias tecnológicas del mundo directamente para ti. Analizadas por IA, respaldadas en Chile.
          </p>
          <div className="flex justify-center gap-4">
             <a href="#tendencias" className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-sm hover:bg-violet-600 hover:text-white transition-all shadow-2xl shadow-white/5 flex items-center gap-2">
                Explorar Tendencias <ChevronRight className="w-4 h-4"/>
             </a>
          </div>
        </header>

        <TrustSection />
        
        <ImpactDashboard />

        {/* PRODUCT GRID */}
        <section id="tendencias" className="container mx-auto px-6 py-20">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
             <div>
                <h2 className="text-4xl font-black mb-3 uppercase tracking-tighter">Winners del Día</h2>
                <p className="text-slate-500 font-medium">Selección curada por nuestro motor de arbitraje inteligente.</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl hidden md:block">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Actualizado hace 5 minutos</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {products.length > 0 ? (
              products.map((p) => <ProductCard key={p.id} product={p} countryCode={countryCode} />)
            ) : (
              <div className="col-span-full py-40 text-center border-2 border-dashed border-slate-800 rounded-[4rem] bg-slate-900/20">
                <Search className="w-12 h-12 text-slate-700 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Sincronizando Nuevas Oportunidades</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">Nuestro motor está validando stock y logística internacional para los próximos ganadores.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER SEO & LEGAL */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-32 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <Zap className="text-violet-500 w-6 h-6 fill-current" />
                <span className="text-2xl font-black tracking-tighter">RAVSTORE</span>
              </div>
              <p className="text-slate-500 text-lg leading-relaxed max-w-md">
                Liderando el arbitraje tecnológico inteligente en Chile. Transformamos datos globales en productos reales en tu puerta.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-8 uppercase text-xs tracking-[0.3em]">Legal</h4>
              <ul className="space-y-4 text-slate-500 text-sm font-medium">
                <li><a href="#" className="hover:text-violet-400 transition-colors">Términos de Servicio</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Política de Privacidad</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Devoluciones (Biobío)</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-8 uppercase text-xs tracking-[0.3em]">Comunidad</h4>
              <div className="flex gap-4">
                 <a href="#" className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-violet-500 transition-all"><Mail className="w-5 h-5"/></a>
                
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
              © 2026 Ravstore. Diseñado y operado desde Cabrero, Región del Biobío, Chile.
            </p>
            <div className="flex items-center gap-8 grayscale opacity-30">
               <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-5" alt="Webpay" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}