// src/components/ProductGridClient.tsx
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
      const catName = p.category_name || 'Otros';
      uniqueCats.add(catName);
    });
    
    return ['Todos', ...Array.from(uniqueCats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return products;
    return products.filter(p => (p.category_name || 'Otros') === selectedCategory);
  }, [products, selectedCategory]);

  if (!products || products.length === 0) return (
    <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Buscando Winners para {countryCode}...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      
      {/* --- NAVEGACIÓN DE CATEGORÍAS TIPO BURBUJA (Estilo App Nativa) --- */}
      {categories.length > 1 && (
        <div className="flex gap-4 md:gap-8 overflow-x-auto pb-4 pt-2 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            // Usamos las primeras dos letras como "Icono" si es una categoría larga
            const shortName = cat === 'Todos' ? 'ALL' : cat.substring(0, 2).toUpperCase();

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex flex-col items-center gap-2 flex-shrink-0 snap-start group outline-none"
              >
                {/* Círculo de la categoría */}
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-lg 
                  ${isSelected 
                    ? 'border-violet-500 bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-900/50 scale-110' 
                    : 'border-slate-800 bg-slate-900 group-hover:border-violet-500/50 group-hover:bg-slate-800'
                  }`}
                >
                  <span className={`text-sm md:text-base font-black tracking-tighter ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {shortName}
                  </span>
                </div>
                {/* Nombre de la categoría */}
                <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider max-w-[70px] truncate text-center transition-colors
                  ${isSelected ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                >
                  {cat}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* --- GRILLA DE PRODUCTOS (Aumentamos densidad visual reduciendo gaps) --- */}
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