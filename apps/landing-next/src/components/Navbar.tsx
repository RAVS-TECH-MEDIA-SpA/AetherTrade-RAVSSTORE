// src/components/Navbar.tsx
'use client';

import { Zap, ShoppingBag, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore'; 
import CartDrawer from './CartDrawer'; 

const TRANSLATIONS: Record<string, any> = {
  CL: { trends: 'Tendencias', howItWorks: 'Cómo Funciona', warranty: 'Garantía', myPurchases: 'Mi Carrito', regionLabel: 'Región' },
  US: { trends: 'Trends', howItWorks: 'How it Works', warranty: 'Guarantee', myPurchases: 'My Cart', regionLabel: 'Region' }
};

interface NavbarProps { countryCode: string; }

export default function Navbar({ countryCode = 'CL' }: NavbarProps) {
  const t = TRANSLATIONS[countryCode.toUpperCase()] || TRANSLATIONS.US;
  const flagCode = countryCode.toLowerCase();
  
  // Zustand State
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false); 

  useEffect(() => setIsMounted(true), []);

  return (
    <>
      {/* Añadimos backdrop-blur para un toque más premium cuando hagan scroll */}
      <nav className="fixed w-full z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        
        {/* Contenedor principal: Usamos flex-wrap para manejar la fila extra en móvil */}
        <div className="container mx-auto px-4 py-3 md:h-20 flex flex-wrap items-center justify-between gap-y-3">
          
          {/* 1. LOGO (Izquierda en Desktop y Móvil) */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 md:w-1/4">
            <div className="bg-violet-600 p-1.5 md:p-2 rounded-lg shadow-[0_0_15px_rgba(124,58,237,0.4)]">
              <Zap className="text-white w-4 h-4 md:w-5 md:h-5 fill-current" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black tracking-tighter text-white uppercase italic">
                RAVS<span className="text-violet-500">STORE</span>
              </span>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest hidden md:flex">
                <img src={`https://flagcdn.com/w20/${flagCode}.png`} alt={countryCode} className="w-3.5 h-auto rounded-[1px]" />
                <span>{t.regionLabel}: {countryCode}</span>
              </div>
            </div>
          </Link>

          {/* 3. ACCIONES / CARRITO (Derecha en Desktop y Móvil - Lo ponemos antes en el DOM por el flex-wrap) */}
          <div className="flex items-center justify-end md:w-1/4 order-2 md:order-3">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 bg-transparent md:bg-slate-900/50 hover:bg-slate-800 md:border md:border-slate-800 text-white p-2 md:px-4 md:py-2 rounded-xl transition-all group"
            >
              <div className="relative">
                <ShoppingBag className="w-6 h-6 md:w-5 md:h-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
                {isMounted && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 md:-top-1.5 md:-right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 md:w-4 md:h-4 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t.myPurchases}</span>
                <span className="text-xs font-black">Total</span>
              </div>
            </button>
          </div>

          {/* 2. SEARCH BAR (Centro en Desktop, Fila completa abajo en Móvil) */}
          <div className="w-full md:w-2/4 md:flex-1 order-3 md:order-2 md:px-6 relative flex">
            <input 
              type="text" 
              placeholder="Buscar productos, gadgets virales..." 
              className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 hover:border-slate-600 text-white px-4 py-2.5 rounded-l-lg focus:outline-none transition-colors text-sm placeholder:text-slate-500 shadow-inner"
            />
            <button className="bg-violet-600 hover:bg-violet-500 px-5 md:px-8 rounded-r-lg flex items-center justify-center transition-colors shadow-lg shadow-violet-900/20">
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>

        </div>
        
        {/* CATEGORÍAS SUB-NAV (Scrollable en móvil para fricción cero) */}
        <div className="bg-slate-900/80 border-t border-slate-800/80 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="container mx-auto px-4 h-9 flex items-center gap-6 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-max">
            <a href="#tendencias" className="hover:text-white transition-colors">{t.trends}</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">{t.howItWorks}</a>
            <a href="#garantia" className="hover:text-white transition-colors flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {t.warranty}
            </a>
            <span className="text-violet-400 flex items-center gap-1 ml-auto">
              <Zap className="w-3.5 h-3.5 fill-current" /> Envíos Gratis a {countryCode}
            </span>
          </div>
        </div>
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}