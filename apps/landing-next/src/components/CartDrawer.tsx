'use client';

import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const total = getTotalPrice();
  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(total);

  // Evitamos errores de hidratación
  if (!isMounted) return null;

  return (
    <>
      {/* 🌑 Overlay oscuro de fondo */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* 🚀 Panel Deslizable */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#020617] border-l border-white/10 z-[160] transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-violet-500" />
            <span className="font-black text-white tracking-widest uppercase italic text-lg">Tu Carrito</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-xs">El carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 bg-white/5 border border-white/5 p-4 rounded-[2rem] shadow-xl">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-black flex-shrink-0 border border-white/5">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight">{item.title}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest">
                      {item.color} {item.size ? `• ${item.size}` : ''}
                    </p>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    {/* Controles de Cantidad */}
                    <div className="flex items-center bg-black/50 rounded-full border border-white/10 px-2 py-1">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white font-black"
                      >-</button>
                      <span className="text-xs font-bold text-white w-6 text-center tabular-nums">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white font-black"
                      >+</button>
                    </div>
                    {/* Precio y Quitar */}
                    <div className="flex flex-col items-end">
                      <span className="text-white font-black">
                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.price * item.quantity)}
                      </span>
                      <button 
                        onClick={() => removeItem(item.id)} 
                        className="text-red-500 hover:text-red-400 text-[10px] uppercase font-bold tracking-widest mt-1 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Total y Botón de Pago) */}
        {items.length > 0 && (
          <div className="border-t border-white/10 p-6 bg-slate-950/80 backdrop-blur-md flex-shrink-0">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Inversión Total</span>
              <span className="text-4xl font-black text-white tracking-tighter">{formattedTotal}</span>
            </div>
            <Link 
              href="/checkout" 
              onClick={onClose} 
              className="w-full flex items-center justify-center gap-2 py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-violet-900/20"
            >
              Procesar Pago Segura <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}