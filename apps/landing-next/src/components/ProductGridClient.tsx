'use client';
import { useState, useMemo } from 'react';
import ProductCard from './ui/ProductCard';

interface ProductGridProps {
  products: any[];
  countryCode: string;
}

export default function ProductGridClient({ products, countryCode }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCats = new Set<string>();
    
    products.forEach(p => {
      // ⚡ Búsqueda profunda de la categoría
      const catName = p.category_name || (p.category && p.category.name) || (typeof p.category === 'string' ? p.category : null) || 'Otros';
      uniqueCats.add(catName);
    });
    
    return ['Todos', ...Array.from(uniqueCats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return products;
    return products.filter(p => {
      const catName = p.category_name || (p.category && p.category.name) || (typeof p.category === 'string' ? p.category : null) || 'Otros';
      return catName === selectedCategory;
    });
  }, [products, selectedCategory]);

  if (!products || products.length === 0) return (
    <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Buscando Winners para {countryCode}...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* --- NAVEGACIÓN DE CATEGORÍAS TIPO PILLS (CHIPS) --- */}
      {categories.length > 1 && (
        <div className="relative w-full">
          {/* ⚡ Fade lateral: Da una pista visual en mobile de que se puede hacer scroll */}
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#020617] to-transparent z-10 pointer-events-none lg:hidden"></div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden px-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-center px-6 py-2.5 rounded-full whitespace-nowrap snap-start border-2 transition-all duration-300 outline-none
                    ${isSelected 
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300 shadow-lg shadow-violet-900/30 scale-[1.02]' 
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-violet-500/30 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                >
                  <span className="text-xs md:text-sm font-black uppercase tracking-wider">
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* --- GRILLA DE PRODUCTOS --- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
            No hay productos en esta categoría por el momento.
          </p>
        </div>
      )}
    </div>
  );
}