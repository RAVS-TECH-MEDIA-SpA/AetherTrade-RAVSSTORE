// src/components/Navbar.tsx
'use client';

import { Zap, ShoppingBag, Search, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
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

  // ⚡ Estados del Buscador Predictivo
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsMounted(true), []);

  // ⚡ Lógica "Debounce" para el buscador
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        // Llamaremos a un nuevo endpoint en el API Gateway
       const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&country=${countryCode}`);
        
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Error en la búsqueda:", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // Espera 400ms después de que el usuario deja de escribir

    return () => clearTimeout(timer);
  }, [searchQuery, countryCode]);

  // Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <nav className="fixed w-full z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        
        <div className="container mx-auto px-4 py-3 md:h-20 flex flex-wrap items-center justify-between gap-y-3">
          
          {/* 1. LOGO */}
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

          {/* 3. ACCIONES / CARRITO */}
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

          {/* 2. SEARCH BAR CON DROPDOWN PREDICTIVO */}
          <div className="w-full md:w-2/4 md:flex-1 order-3 md:order-2 md:px-6 relative flex" ref={searchRef}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
              placeholder="Buscar productos, gadgets virales..." 
              className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 hover:border-slate-600 text-white px-4 py-2.5 rounded-l-lg focus:outline-none transition-colors text-sm placeholder:text-slate-500 shadow-inner"
            />
            <button className="bg-violet-600 hover:bg-violet-500 px-5 md:px-8 rounded-r-lg flex items-center justify-center transition-colors shadow-lg shadow-violet-900/20">
              {isSearching ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Search className="w-5 h-5 text-white" />}
            </button>

            {/* ⚡ DROPDOWN DE RESULTADOS */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 mx-0 md:mx-6 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {searchResults.length > 0 ? (
                  <ul className="max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    {searchResults.map((prod) => (
                      <li key={prod.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800 transition-colors">
                        <Link 
                          href={`/products/${prod.id}`}
                          onClick={() => {
                            setShowDropdown(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-4 p-3"
                        >
                          <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0">
                            <img src={prod.image_url} alt={prod.title_original} className="w-full h-full object-cover mix-blend-multiply" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {prod.marketing_copy?.title_localized || prod.title_original}
                            </span>
                            <span className="text-[10px] text-violet-400 font-black uppercase tracking-wider">
                              {prod.category_name || 'Producto'}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !isSearching && searchQuery.length >= 3 && (
                    <div className="p-6 text-center text-sm text-slate-400">
                      No encontramos resultados para "<span className="text-white font-bold">{searchQuery}</span>"
                    </div>
                  )
                )}
              </div>
            )}
          </div>

        </div>
        
        {/* CATEGORÍAS SUB-NAV */}
        <div className="bg-slate-900/80 border-t border-slate-800/80 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="container mx-auto px-4 h-9 flex items-center gap-6 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-max">
            <a href="#tendencias" className="hover:text-white transition-colors">{t.trends}</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">{t.howItWorks}</a>
            <a href="#garantia" className="hover:text-white transition-colors flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {t.warranty}
            </a>
            <span className="text-violet-400 flex items-center gap-1 ml-auto">
              <Zap className="w-3.5 h-3.5 fill-current" /> Envíos Gratis a Chile
            </span>
          </div>
        </div>
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}