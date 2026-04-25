'use client';

import { Zap, ShoppingBag, Globe } from 'lucide-react';

interface NavbarProps {
  countryCode: string;
}

export default function Navbar({ countryCode }: NavbarProps) {
  return (
    <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="bg-violet-600 p-2 rounded-xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-violet-500/20">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-black tracking-tighter text-white uppercase">
              RAV<span className="text-violet-500">STORE</span>
            </span>
            <div className="flex items-center gap-1">
              <Globe className="w-2.5 h-2.5 text-slate-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Region: {countryCode}
              </span>
            </div>
          </div>
        </div>

        {/* Menu - Hidden on Mobile */}
        <div className="hidden md:flex gap-10 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
          <a href="#" className="hover:text-violet-400 transition-colors">Tendencias</a>
          <a href="#" className="hover:text-violet-400 transition-colors">Cómo Funciona</a>
          <a href="#" className="hover:text-violet-400 transition-colors">Garantía</a>
        </div>

        {/* Action Button */}
        <button className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-tighter hover:bg-violet-600 hover:text-white transition-all duration-300 flex items-center gap-2 group shadow-xl">
          <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Mis Compras
        </button>
      </div>
    </nav>
  );
}