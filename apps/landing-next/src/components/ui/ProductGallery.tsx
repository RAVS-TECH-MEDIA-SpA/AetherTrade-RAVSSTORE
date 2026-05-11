'use client';
import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  mainImage: string;
}

export default function ProductGallery({ images, mainImage }: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(mainImage);

  return (
    <div className="space-y-6">
      <div className="aspect-[4/5] overflow-hidden rounded-[4rem] bg-slate-900 border border-white/5 shadow-inner">
        <img src={activeImage} className="h-full w-full object-cover transition-all duration-1000 hover:scale-110" alt="Main" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {[mainImage, ...images].filter(Boolean).map((img, i) => (
          <button 
            key={i} 
            onClick={() => setActiveImage(img)}
            className={`h-28 w-28 rounded-[2rem] border-2 flex-shrink-0 overflow-hidden transition-all duration-300 ${
              activeImage === img ? 'border-violet-600 scale-105 shadow-xl' : 'border-transparent opacity-40 grayscale hover:grayscale-0 hover:opacity-100'
            }`}
          >
            <img src={img} className="h-full w-full object-cover" alt="thumb" />
          </button>
        ))}
      </div>
    </div>
  );
}