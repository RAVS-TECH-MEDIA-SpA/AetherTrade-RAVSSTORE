// apps/landing-next/src/components/ProductCard.tsx
'use client';
import { TrendingUp, ArrowRight } from 'lucide-react';

export const ProductCard = ({ product }: { product: any }) => {
  const clp = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300">
      <div className="relative aspect-square">
        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-green-400 text-xs font-bold px-3 py-1.5 rounded-full border border-green-500/30 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {product.roi_percent}% ROI ESTIMADO
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-white font-bold text-lg line-clamp-2 mb-4 leading-snug">{product.title_original}</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Precio Lanzamiento</p>
            <p className="text-2xl font-black text-white">{clp(product.suggested_price_local)}</p>
          </div>
          <a href={`https://www.aliexpress.com/item/${product.aliexpress_id}.html`} target="_blank" className="bg-violet-600 hover:bg-violet-500 p-3 rounded-2xl transition-colors">
            <ArrowRight className="text-white w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
};