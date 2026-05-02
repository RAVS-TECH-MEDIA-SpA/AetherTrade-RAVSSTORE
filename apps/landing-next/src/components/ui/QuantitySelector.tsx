// apps/landing-next/src/components/ui/QuantitySelector.tsx
'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  setQuantity: (value: number) => void;
  maxStock?: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({ 
  quantity, 
  setQuantity, 
  maxStock = 10 
}) => {
  
  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxStock) {
      setQuantity(quantity + 1);
    }
  };

  return (
    <div className="flex flex-col gap-3 my-4">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
        Seleccionar Cantidad
      </label>
      <div className="flex items-center w-fit bg-[#121418] border border-gray-800 rounded-2xl overflow-hidden shadow-inner">
        <button 
          onClick={handleDecrement}
          type="button"
          className="p-4 hover:bg-[#1c1f26] text-teal-400 transition-all active:scale-90"
          aria-label="Disminuir cantidad"
        >
          <Minus size={20} strokeWidth={3} />
        </button>
        
        <input 
          type="number" 
          value={quantity}
          readOnly
          className="w-14 bg-transparent text-center font-black text-xl text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button 
          onClick={handleIncrement}
          type="button"
          className="p-4 hover:bg-[#1c1f26] text-teal-400 transition-all active:scale-90"
          aria-label="Aumentar cantidad"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>
      {quantity > 1 && (
        <p className="text-[11px] text-teal-500 font-bold animate-pulse">
          ✨ ¡Estás ahorrando en el costo de envío!
        </p>
      )}
    </div>
  );
};