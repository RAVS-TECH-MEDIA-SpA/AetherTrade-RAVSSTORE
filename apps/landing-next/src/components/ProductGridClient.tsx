// src/components/ProductGridClient.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import ProductCard from './ui/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react'; 

interface ProductGridProps {
  products: any[];
  categoriesList: string[]; // ⚡ ESTO ES LO NUEVO: Recibe la lista estricta (10) desde el padre
  countryCode: string;
}

export default function ProductGridClient({ products, categoriesList, countryCode }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // ⚡ REEMPLAZAMOS LA LÓGICA ANTIGUA CON ESTA LÍNEA
  // Ya no adivinamos las categorías, usamos las 10 exactas que nos mandó page.tsx
  const tabs = ['Todos', ...(categoriesList || [])];

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') {
      // ⚡ Limitamos la vista "Todos" a 24 productos (o 20) para no hacer la grilla infinita
      return products.slice(0, 24); 
    }
    return products.filter(p => {
      const catName = p.category_name || (p.category && p.category.name) || (typeof p.category === 'string' ? p.category : null) || 'Otras Novedades';
      return catName === selectedCategory;
    });
  }, [products, selectedCategory]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll(); 
    }, 150);

    window.addEventListener('resize', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleScroll);
    };
  }, [categoriesList]); // ⚡ Escuchamos el categoriesList 

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return (
    <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Buscando Winners para {countryCode}...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      
      {tabs.length > 1 && (
        <div className="relative w-full group">
          
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="hidden md:flex absolute left-0 top-0 bottom-4 z-20 w-16 items-center justify-start pl-1 bg-gradient-to-r from-[#020617] via-[#020617]/90 to-transparent text-slate-400 hover:text-violet-400 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 drop-shadow-md" />
            </button>
          )}

          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#020617] to-transparent z-10 pointer-events-none lg:hidden"></div>
          
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden px-1"
          >
            {/* ⚡ Iteramos sobre 'tabs' en lugar de calcular 'categories' */}
            {tabs.map((cat) => {
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

          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="hidden md:flex absolute right-0 top-0 bottom-4 z-20 w-20 items-center justify-end pr-1 bg-gradient-to-l from-[#020617] via-[#020617]/90 to-transparent text-slate-400 hover:text-violet-400 transition-colors"
            >
              <ChevronRight className="w-6 h-6 drop-shadow-md" />
            </button>
          )}

        </div>
      )}

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