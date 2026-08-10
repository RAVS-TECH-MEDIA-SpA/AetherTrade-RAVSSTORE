// src/components/ui/VariantSelector.tsx
'use client';

import { useState, useEffect } from 'react';

export default function VariantSelector({ variants, selectedVariant, onSelectVariant }: any) {
  // Extraemos atributos únicos
  const colors = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[];

  // Estados locales para la selección cruzada
  const [selectedColor, setSelectedColor] = useState(selectedVariant?.color || colors[0]);
  const [selectedSize, setSelectedSize] = useState(selectedVariant?.size || sizes[0]);

  // Efecto cruzado: Si el usuario cambia un color o talla, buscamos la variante exacta
  useEffect(() => {
    let match = variants.find((v: any) => 
      (colors.length === 0 || v.color === selectedColor) && 
      (sizes.length === 0 || v.size === selectedSize)
    );

    // Fallback inteligente: Si el usuario elige un color que no tiene la talla actual, 
    // seleccionamos la primera talla disponible de ese nuevo color para no romper la UI.
    if (!match && selectedColor) {
      match = variants.find((v: any) => v.color === selectedColor);
      if (match && match.size) setSelectedSize(match.size);
    }

    if (match && match.id !== selectedVariant?.id) {
      onSelectVariant(match);
    }
  }, [selectedColor, selectedSize, variants, colors.length, sizes.length, selectedVariant?.id, onSelectVariant]);

  // Si el producto no tiene variantes configurables, no renderizamos nada
  if (colors.length === 0 && sizes.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* 🎨 FILA DE COLORES (Con miniatura si existe) */}
      {colors.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color</label>
            <span className="text-xs font-medium text-violet-400">{selectedColor}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              // Buscamos la primera variante que tenga este color para usar su imagen
              const variantForImage = variants.find((v: any) => v.color === color);
              const img = variantForImage?.image_url || variantForImage?.image;
              
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`group relative h-14 w-14 rounded-xl border-2 transition-all overflow-hidden ${
                    selectedColor === color 
                      ? 'border-violet-500 scale-110 shadow-lg shadow-violet-500/20' 
                      : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                  }`}
                  title={color}
                >
                  {img ? (
                    <img src={img} alt={color} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                      {color.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 📏 FILA DE TALLAS / ESPECIFICACIONES */}
      {sizes.length > 0 && (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Especificación / Talla</label>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-5 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  selectedSize === size 
                  ? 'border-violet-500 bg-violet-600/20 text-white shadow-lg shadow-violet-900/20' 
                  : 'border-white/10 bg-slate-900/50 text-slate-400 hover:border-white/30 hover:bg-slate-800'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}