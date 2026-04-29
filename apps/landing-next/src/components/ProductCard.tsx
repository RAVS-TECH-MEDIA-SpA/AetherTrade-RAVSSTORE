'use client';
import { PlayCircle, Truck, ShoppingCart } from 'lucide-react';

export default function ProductCard({ product, onClick }: { product: any; onClick: () => void }) {
  const deliveryInfo = product.target_country === 'CL' ? '10-12 días' : 'Internacional';

  return (
    <div 
      onClick={onClick}
      className="group relative bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] overflow-hidden hover:border-violet-500 transition-all duration-500 cursor-pointer flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.image_url} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={product.title_original}
        />

        {/* Badge de Envío */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          <div className="bg-emerald-500 text-black text-[9px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 uppercase">
            <Truck className="w-3.5 h-3.5" /> Envío Gratis Chile
          </div>
          <div className="bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-3 py-1 rounded-full w-fit">
             Llega en {deliveryInfo}
          </div>
        </div>

        {/* Icono de Video */}
        {product.video_url && (
          <div className="absolute top-4 right-4 bg-violet-600/90 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-xl">
            <PlayCircle className="w-6 h-6 text-white animate-pulse" />
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-white font-bold text-sm leading-tight mb-4 line-clamp-2">
          {product.marketing_copy?.headline || product.title_original}
        </h3>

        <div className="mt-auto flex items-end justify-between">
          <p className="text-2xl font-black text-white tracking-tighter">
            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(product.suggested_price_local)}
          </p>
          <div className="bg-violet-600 p-3 rounded-2xl group-hover:bg-violet-500 transition-colors">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}