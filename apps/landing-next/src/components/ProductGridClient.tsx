// src/components/ProductGridClient.tsx
'use client';
import ProductCard from './ui/ProductCard';

interface ProductGridProps {
  products: any[];
  countryCode: string; // ⚡ FIX: Ahora la Home puede pasar el countryCode
}

export default function ProductGridClient({ products, countryCode }: ProductGridProps) {
  if (!products || products.length === 0) return (
    <div className="text-center py-20 border border-dashed border-slate-800 rounded-[3rem]">
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Buscando Winners para {countryCode}...</p>
    </div>
  );

  return (
    <div className="relative">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-20 relative z-10">
        {products.map((product, index) => {
          const isFeatured = index === 0 || index === 5;
          return (
            <div key={product.id} className={isFeatured ? 'md:col-span-1' : ''}>
              <ProductCard product={product} isFeatured={isFeatured} />
            </div>
          );
        })}
      </div>
    </div>
  );
}