// src/components/ui/ProductCard.tsx
'use client';

import Link from 'next/link';
import { Zap, Sparkles } from 'lucide-react';

interface ProductCardProps {
  product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
  const internalId = product.id;
  
  // ⚡ Lógica de rescate de imágenes de Google Cloud
  const cloudImages = Array.isArray(product.local_images) 
    ? product.local_images.filter((img: string) => img && img.trim() !== '') 
    : [];
  const displayImage = cloudImages.length > 0 ? cloudImages[0] : product.image_url;

  const currentPrice = product.calculated_min_price ?? 0;
  const oldPrice = product.calculated_old_price ?? 0;
  const discountPercent = product.calculated_discount_percent ?? 0;

  const formattedPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(currentPrice);

  const formattedOldPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(oldPrice);

  return (
    <div className="group flex flex-col bg-slate-900 border border-slate-800 hover:border-violet-500 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-violet-900/20 h-full relative">
      
      {discountPercent > 0 && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <span className="bg-rose-600 text-white text-[8px] md:text-[9px] font-black px-2 py-1 rounded-sm uppercase tracking-widest shadow-sm">
            -{discountPercent}% DTO
          </span>
        </div>
      )}

      <Link href={`/products/${internalId}`} className="flex flex-col flex-1">
        <div className="aspect-square w-full bg-white relative p-2 flex items-center justify-center overflow-hidden">
          <img
            src={displayImage}
            alt={product.title_original}
            className="object-contain w-full h-full mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        </div>
        
        <div className="p-2 md:p-3 flex flex-col flex-1 gap-1">
          <h3 className="text-slate-300 font-medium text-[11px] md:text-xs line-clamp-2 leading-tight group-hover:text-violet-400 transition-colors">
            {product.marketing_copy?.title_localized || product.title_original}
          </h3>
          
          <div className="flex items-center gap-1.5 pt-1 text-violet-300">
            <Sparkles className="h-3 w-3" />
            <span className="text-[9px] font-bold uppercase tracking-wider md:text-[10px]">
              Selección RavsStore
            </span>
          </div>

          <div className="mt-0.5 flex flex-col">
            {oldPrice > 0 && (
              <span className="text-slate-500 text-[10px] line-through decoration-rose-500/50 decoration-2">
                {formattedOldPrice}
              </span>
            )}
            <span className="text-lg md:text-xl font-black text-white leading-none tracking-tight">
              {formattedPrice}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-2 pb-2 md:px-3 md:pb-3 mt-1">
        <Link 
          href={`/products/${internalId}`}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white border border-slate-700 hover:bg-violet-600 hover:border-violet-500 hover:shadow-lg hover:shadow-violet-600/20 active:scale-95 rounded-lg py-2 md:py-2.5 text-[11px] md:text-xs font-bold uppercase tracking-wider transition-all"
        >
          <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>Descubrir Producto ⚡</span>
        </Link>
      </div>

    </div>
  );
}