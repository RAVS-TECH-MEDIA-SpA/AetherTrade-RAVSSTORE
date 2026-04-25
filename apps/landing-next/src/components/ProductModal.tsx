'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, ShoppingCart, ZoomIn, Truck, Star } from 'lucide-react';

export default function ProductModal({ productId, onClose }: { productId: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [activeImg, setActiveImg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`https://ravstore-monorepo.vercel.app/api/products/${productId}`)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar el producto');
        return res.json();
      })
      .then(json => {
        setData(json);
        const initial = json.local_images?.[0] || json.serper_images?.[0] || json.gallery?.[0];
        setActiveImg(initial || 'https://via.placeholder.com/600');
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [productId]);

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="text-violet-500 animate-pulse font-black uppercase tracking-widest">Cargando Winner...</div>
    </div>
  );

  if (error || !data) return null;

  const gallery = Array.from(new Set([
    ...(data.local_images || []),
    ...(data.serper_images || []),
    ...(data.gallery || [])
  ])).filter(img => img && typeof img === 'string');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[3rem] relative shadow-2xl flex flex-col md:flex-row">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white z-[110] bg-slate-900/50 p-2 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        {/* VISOR DE IMÁGENES */}
        <div className="w-full md:w-1/2 p-8 flex flex-col gap-6 bg-slate-900/10">
          <div className="relative group aspect-square rounded-[2.5rem] overflow-hidden border border-slate-800 bg-slate-900/50">
            <img 
              src={activeImg} 
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" 
              alt="Vista principal"
              onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/600'}
            />
            <div className="absolute top-6 left-6 bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 uppercase tracking-widest">
              <Truck className="w-3.5 h-3.5" /> Envío Gratis Chile
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {gallery.map((img: string, i: number) => (
              <button 
                key={i}
                onClick={() => setActiveImg(img)}
                className={`flex-shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all ${activeImg === img ? 'border-violet-500 scale-95 shadow-lg shadow-violet-500/20' : 'border-slate-800 opacity-40 hover:opacity-100'}`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="w-full md:w-1/2 p-12 overflow-y-auto border-l border-slate-800/50 flex flex-col">
          <div className="flex items-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
            <span className="text-[10px] text-slate-500 font-black ml-2 uppercase tracking-[0.2em]">Selección Premium</span>
          </div>

          <h2 className="text-4xl font-black leading-[1.1] text-white tracking-tighter mb-6">
            {data.marketing_copy?.headline || data.title_original}
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            {data.marketing_copy?.description}
          </p>
          
          <div className="space-y-4 mb-12">
            {data.marketing_copy?.bullets?.map((b: string, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{b}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
              <p className="text-5xl font-black text-white tracking-tighter">
                ${new Intl.NumberFormat('es-CL').format(data.suggested_price_local || 0)}
              </p>
            </div>
            <button className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl shadow-violet-600/20 active:scale-95 flex items-center gap-3">
              <ShoppingCart className="w-4 h-4" /> Comprar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}