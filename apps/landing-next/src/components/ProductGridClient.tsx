// src/components/ProductGridClient.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import ProductCard from './ui/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react'; 

interface ProductGridProps {
  products: any[];
  categoriesList: string[]; // Recibe la lista estricta (10) desde el padre
  countryCode: string;
}

export default function ProductGridClient({ products, categoriesList, countryCode }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Destacados');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Ya no adivinamos las categorías, usamos las 10 exactas que nos mandó page.tsx
  const tabs = ['Destacados', ...(categoriesList || [])];

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Destacados') {
      // Limitamos la vista "Destacados" a 24 productos (o 20) para no hacer la grilla infinita
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
  }, [categoriesList]); // Escuchamos el categoriesList 

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
        <div className="relative w-full group overflow-hidden">
          
          {/* Sombra de desvanecimiento izquierda */}
          <div className={`absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-[#020617] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />

          {/* Flecha Izquierda Flotante */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-4 z-20 w-12 flex items-center justify-start bg-transparent text-slate-400 hover:text-violet-400 transition-colors"
            >
              <div className="bg-[#020617]/90 backdrop-blur-sm border border-white/10 rounded-full p-1 ml-1 hover:bg-slate-800 transition-all shadow-lg">
                <ChevronLeft className="w-5 h-5" />
              </div>
            </button>
          )}

          {/* Sombra de desvanecimiento derecha profunda (Invita al scroll) */}
          <div className={`absolute right-0 top-0 bottom-4 w-28 md:w-32 bg-gradient-to-l from-[#020617] via-[#020617]/90 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />

          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-2 md:gap-3 overflow-x-auto pb-5 pt-2 snap-x scroll-smooth [&::-webkit-scrollbar]:hidden px-1 relative z-0"
          >
            {/* Iteramos sobre 'tabs' con UI/UX mejorada y prevención de colapso */}
            {tabs.map((cat) => {
              const isSelected = selectedCategory === cat;
              const isDestacados = cat === 'Destacados';
              
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  // shrink-0 ES VITAL: Obliga al botón a respetar el ancho de su texto y no colapsar
                  className={`shrink-0 relative flex items-center justify-center px-4 md:px-5 py-2 rounded-full whitespace-nowrap snap-start border transition-all duration-300 outline-none group/tab
                    ${isSelected 
                      ? 'border-violet-500 bg-violet-600/15 text-violet-300 shadow-[0_0_15px_-3px_rgba(139,92,246,0.25)]' 
                      : 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                >
                  {/* Capa de brillo en hover para inactivas */}
                  {!isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/10 to-violet-500/0 opacity-0 group-hover/tab:opacity-100 transition-opacity duration-500 pointer-events-none rounded-full" />
                  )}

                  {/* Indicador LED sutil */}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mr-2 transition-colors duration-300 ${
                    isSelected 
                      ? 'bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.8)]' 
                      : isDestacados 
                        ? 'bg-slate-500 group-hover/tab:bg-violet-400/50' 
                        : 'hidden'
                  }`} />
                  
                  {/* Fuente reducida y espaciada */}
                  <span className={`text-[10px] md:text-[11px] uppercase tracking-[0.15em] relative z-10 transition-all ${
                    isSelected ? 'font-black' : 'font-semibold'
                  }`}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Flecha Derecha CTA: Efecto neón pulsante para atraer el clic/swipe */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-0 bottom-4 z-20 w-16 flex items-center justify-end pr-1 bg-transparent group/cta"
              title="Ver más categorías"
            >
              <div className="flex items-center justify-center bg-violet-600/20 backdrop-blur-md border border-violet-500/50 rounded-full p-1.5 text-violet-300 shadow-[0_0_15px_-3px_rgba(139,92,246,0.4)] group-hover/cta:bg-violet-600 group-hover/cta:text-white group-hover/cta:scale-110 group-hover/cta:shadow-[0_0_20px_rgba(139,92,246,0.6)] transition-all animate-pulse group-hover/cta:animate-none">
                <ChevronRight className="w-5 h-5" />
              </div>
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