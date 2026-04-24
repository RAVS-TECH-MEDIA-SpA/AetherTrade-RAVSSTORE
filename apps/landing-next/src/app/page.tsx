// apps/landing-next/src/app/page.tsx
import { pool } from '@/lib/db';
import { 
  Zap, 
  ShoppingBag, 
  TrendingUp, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  CreditCard,
  Star,
  ExternalLink
} from 'lucide-react';

// --- FUNCIONALIDAD DE BASE DE DATOS ---
async function getWinners() {
  try {
    // Buscamos solo los que la IA ya marcó como WINNER
    const res = await pool.query(
      "SELECT * FROM products WHERE status = 'WINNER' ORDER BY created_at DESC"
    );
    return res.rows;
  } catch (error) {
    console.error("❌ Error fetch DB:", error);
    return [];
  }
}

// --- COMPONENTES DE DISEÑO ---

const Navbar = () => (
  <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
    <div className="container mx-auto px-6 h-20 flex items-center justify-between">
      <div className="flex items-center gap-2 group cursor-pointer">
        <div className="bg-violet-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
          <Zap className="text-white w-6 h-6 fill-current" />
        </div>
        <span className="text-2xl font-black tracking-tighter text-white">
          RAV<span className="text-violet-500">STORE</span>
        </span>
      </div>
      
      <div className="hidden md:flex gap-10 text-sm font-bold uppercase tracking-widest text-slate-400">
        <a href="#tendencias" className="hover:text-white transition-colors">Tendencias</a>
        <a href="#garantia" className="hover:text-white transition-colors">Garantía</a>
        <a href="#contacto" className="hover:text-white transition-colors">Soporte</a>
      </div>

      <button className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold hover:bg-violet-500 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-white/5">
        <ShoppingBag className="w-4 h-4" />
        Ver Catálogo
      </button>
    </div>
  </nav>
);

const Hero = () => (
  <section className="relative pt-40 pb-20 overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-violet-600/10 blur-[120px] rounded-full -z-10" />
    <div className="container mx-auto px-6 text-center">
      <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full mb-8">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
        </span>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Impulsado por IA en Tiempo Real</span>
      </div>
      <h1 className="text-5xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tight">
        DESCUBRE <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">TENDENCIAS</span> <br /> ANTES QUE NADIE
      </h1>
      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
        Analizamos miles de productos globales con Inteligencia Artificial para traerte solo lo que es rentable y viral en Chile.
      </p>
    </div>
  </section>
);

const ProductCard = ({ product }: { product: any }) => {
  const clp = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-violet-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10">
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.image_url || 'https://via.placeholder.com/400x400?text=Ravstore+Product'} 
          alt={product.title_original} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-black/80 backdrop-blur-md text-green-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-green-500/30 flex items-center gap-1 uppercase tracking-tighter">
            <TrendingUp className="w-3 h-3" />
            {product.roi_percent}% ROI Estimado
          </div>
        </div>
      </div>
      
      <div className="p-8">
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
          ))}
          <span className="text-[10px] text-slate-500 font-bold ml-1">{product.sales_count}+ Ventas</span>
        </div>
        <h3 className="text-white font-bold text-xl line-clamp-2 mb-6 min-h-[3.5rem] leading-tight">
          {product.title_original}
        </h3>
        
        <div className="flex items-end justify-between gap-4 pt-6 border-t border-slate-800">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] mb-1">Precio Ravstore</p>
            <p className="text-3xl font-black text-white">{clp(product.suggested_price_local || 0)}</p>
          </div>
          <a 
            href={`https://www.aliexpress.com/item/${product.aliexpress_id}.html`} 
            target="_blank" 
            className="bg-violet-600 hover:bg-violet-500 text-white p-4 rounded-2xl transition-all hover:rotate-6 active:scale-95"
          >
            <ExternalLink className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---

export default async function Home() {
  const products = await getWinners();

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500 selection:text-white">
      <Navbar />
      
      <main>
        <Hero />

        {/* Sección de Confianza */}
        <section id="garantia" className="container mx-auto px-6 mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-900/50 border border-slate-800 p-12 rounded-[3rem]">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center text-violet-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-xl text-white">Calidad Curada</h4>
              <p className="text-slate-400 text-sm">Cada producto es testeado por nuestra IA bajo 15 parámetros de calidad y fiabilidad.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center text-violet-400">
                <Truck className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-xl text-white">Envío Regional</h4>
              <p className="text-slate-400 text-sm">Especialistas en la Región del Biobío y despacho rápido a todo el territorio nacional.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center text-violet-400">
                <CreditCard className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-xl text-white">Pago Seguro</h4>
              <p className="text-slate-400 text-sm">Integración total con Webpay Plus. Paga en cuotas con tu banco preferido.</p>
            </div>
          </div>
        </section>

        {/* Grilla de Productos */}
        <section id="tendencias" className="container mx-auto px-6 py-20">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">WINNERS DE HOY</h2>
              <p className="text-slate-400 font-medium">Selección exclusiva de alta rentabilidad actualizada hace instantes.</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Total Analizados hoy</p>
              <p className="text-3xl font-black text-violet-500">1,248</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.length > 0 ? (
              products.map((p) => <ProductCard key={p.id} product={p} />)
            ) : (
              <div className="col-span-full py-40 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
                <div className="bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-2xl font-bold text-slate-600 mb-2">Buscando nuevos ganadores...</h3>
                <p className="text-slate-500">Nuestra IA está analizando tendencias en este momento. Vuelve pronto.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Profesional */}
      <footer id="contacto" className="bg-slate-950 pt-32 pb-12 border-t border-slate-900">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-violet-600 p-1.5 rounded-lg">
                  <Zap className="text-white w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-black text-white">RAVSTORE</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Somos el primer portal de arbitraje inteligente en Chile. Transformamos datos complejos en oportunidades reales para tu negocio.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-20">
              <div>
                <h5 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Tienda</h5>
                <ul className="space-y-4 text-slate-500 text-sm font-medium">
                  <li><a href="#" className="hover:text-violet-400">Ver Tendencias</a></li>
                  <li><a href="#" className="hover:text-violet-400">Ofertas Flash</a></li>
                  <li><a href="#" className="hover:text-violet-400">Categorías</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Info</h5>
                <ul className="space-y-4 text-slate-500 text-sm font-medium">
                  <li><a href="#" className="hover:text-violet-400">Garantía Rav</a></li>
                  <li><a href="#" className="hover:text-violet-400">Despachos</a></li>
                  <li><a href="#" className="hover:text-violet-400">Privacidad</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-slate-900">
            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
              © 2026 Ravstore. Hecho en la Región del Biobío, Chile.
            </p>
            <div className="flex items-center gap-6 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" alt="Mastercard" />
              <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-6" alt="Webpay" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}