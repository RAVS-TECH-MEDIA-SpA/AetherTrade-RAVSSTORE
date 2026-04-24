// apps/landing-next/src/components/Navbar.tsx
'use client';
import { Zap, ShoppingBag } from 'lucide-react';

export const Navbar = () => (
  <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
    <div className="container mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2 group cursor-pointer">
        <div className="bg-violet-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          RAV<span className="text-violet-500">STORE</span>
        </span>
      </div>
      <div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
        <a href="#" className="hover:text-white transition-colors">Tendencias</a>
        <a href="#" className="hover:text-white transition-colors">Cómo Funciona</a>
        <a href="#" className="hover:text-white transition-colors">Garantía</a>
      </div>
      <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-violet-500 hover:text-white transition-all flex items-center gap-2">
        <ShoppingBag className="w-4 h-4" />
        Mis Compras
      </button>
    </div>
  </nav>
);