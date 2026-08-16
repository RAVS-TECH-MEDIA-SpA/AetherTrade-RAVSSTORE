// src/components/ProductCarousel.tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import ProductCard from './ui/ProductCard'; 

interface ProductCarouselProps {
  title: string;
  products: any[];
}

export default function ProductCarousel({ title, products }: ProductCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -500 : 500;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="py-8 w-full border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6 mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-500" />
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest italic">
          {title}
        </h2>
      </div>

      <div className="relative group container mx-auto px-4 md:px-6">
        
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-24 items-center justify-center bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-violet-600 transition-all shadow-2xl"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 pt-2 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div key={product.id} className="snap-start shrink-0 w-[240px] md:w-[280px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-24 items-center justify-center bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-violet-600 transition-all shadow-2xl"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
        
      </div>
    </div>
  );
}