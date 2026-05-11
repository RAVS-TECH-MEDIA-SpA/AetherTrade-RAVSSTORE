// src/components/ui/ProductCard.tsx
import Link from 'next/link';

interface ProductCardProps {
  product: any;
  isFeatured?: boolean;
}

export default function ProductCard({ product, isFeatured }: ProductCardProps) {
  const aliId = product.aliexpress_id || product.id;
  
  // ⚡ FIX PRECIO: Calculamos el precio real más bajo desde las variantes
  let finalPrice = Number(product.suggested_price_local);
  if (product.variants && product.variants.length > 0) {
    const minVariantPrice = Math.min(
      ...product.variants.map((v: any) => Number(v.additional_cost_usd) * Number(product.rate_to_usd || 1))
    );
    if (!isNaN(minVariantPrice) && minVariantPrice > 0) {
      finalPrice = minVariantPrice;
    }
  }

  const price = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(finalPrice);

  return (
    <Link 
      href={`/products/${aliId}`} 
      className={`group relative block bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden transition-all duration-700 
                 hover:border-violet-500/50 hover:shadow-[0_0_50px_-15px_rgba(139,92,246,0.4)] 
                 ${isFeatured ? 'md:scale-[1.05] border-slate-700/50 z-10' : 'opacity-90 hover:opacity-100'}`}
    >
      <div className="aspect-square w-full overflow-hidden bg-slate-950 relative">
        <img
          src={product.image_url}
          alt={product.title_original}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100"
        />
        <div className="absolute top-6 left-6">
          <span className="bg-black/60 backdrop-blur-xl border border-white/10 text-[9px] font-black text-violet-400 px-3 py-1.5 rounded-full uppercase tracking-[0.2em]">
            Aether Engine Pick
          </span>
        </div>
      </div>
      
      <div className="p-8 space-y-4">
        <h3 className="text-slate-300 font-bold text-lg line-clamp-2 leading-tight group-hover:text-white transition-colors duration-300">
          {product.marketing_copy?.title_localized || product.title_original}
        </h3>
        <div className="flex items-center justify-between pt-2">
          <p className="text-2xl font-black text-white tracking-tighter">{price}</p>
          <div className="h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-violet-600 transition-all duration-500 group-hover:rotate-6">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}