'use client';
import { useState } from 'react';
import { Star, Plus, Truck } from 'lucide-react';
import ProductModal from './ProductModal';

export default function ProductGridClient({ products, countryCode }: { products: any[], countryCode: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
        };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {products.length > 0 ? (
          products.map((p) => (
            <article 
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className="group cursor-pointer bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-[2.5rem] overflow-hidden hover:border-violet-500/40 transition-all duration-500 flex flex-col h-full shadow-2xl hover:shadow-violet-500/10 relative"
            >
            {/* Imagen con Overlay de Gradiente */}
            <div className="relative aspect-square overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                    src={
                        // Prioridad 1: Tu bucket (Santiago)
                        (p.local_images && p.local_images.length > 0) ? p.local_images[0] : 
                        // Prioridad 2: Google Serper (Lifestyle)
                        (p.serper_images && p.serper_images.length > 0) ? p.serper_images[0] : 
                        // Prioridad 3: Placeholder (Si todo falla)
                        'https://via.placeholder.com/600x600'
                    }
                    className="w-full h-full object-cover"
                    alt={p.title_original}
                    />
                
                {/* BADGE ENVIO GRATIS - Ahora más vibrante */}
                <div className="absolute top-5 left-5 z-20">
                <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] uppercase tracking-widest flex items-center gap-1.5 animate-in zoom-in duration-700">
                    <Truck className="w-3.5 h-3.5" /> Envío Gratis Chile
                </div>
                </div>
            </div>
            
            <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                <span className="text-[9px] text-slate-500 font-bold ml-2 uppercase tracking-tighter">Verificado por IA</span>
                </div>

                <h3 className="text-slate-100 font-bold text-xl line-clamp-2 mb-6 leading-tight group-hover:text-white transition-colors">
                {p.marketing_copy?.headline || p.title_original}
                </h3>
                
                <div className="mt-auto flex items-end justify-between gap-2">
                <div className="flex flex-col">
                    <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1">Precio Oferta</span>
                    <span className="text-3xl font-black text-white tracking-tighter">
                    {formatPrice(p.suggested_price_local || 0)}
                    </span>
                </div>
                
                {/* Botón de acción con efecto glow */}
                <div className="bg-violet-600 group-hover:bg-violet-500 text-white h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-lg group-hover:shadow-violet-600/40 active:scale-95">
                    <Plus className="w-7 h-7" />
                </div>
                </div>
            </div>
        </article>
          ))
        ) : (
          <div className="col-span-full py-40 text-center border-2 border-dashed border-slate-800 rounded-[4rem]">
            <p className="text-slate-500 uppercase font-black tracking-widest">Sincronizando Winners para Chile...</p>
          </div>
        )}
      </div>

      {selectedId && (
        <ProductModal 
          productId={selectedId} 
          onClose={() => setSelectedId(null)} 
        />
      )}
    </>
  );
}