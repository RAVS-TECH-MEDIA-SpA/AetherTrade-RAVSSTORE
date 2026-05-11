'use client';

import { Zap, ShoppingBag, Globe, Link as LinkIcon } from 'lucide-react'; // Renombrado el icono para evitar conflicto
import Link from 'next/link'; // Importación correcta de Next.js para navegación

// Diccionario de idiomas por país (Predominantes)
const TRANSLATIONS: Record<string, any> = {
  CL: {
    trends: 'Tendencias',
    howItWorks: 'Cómo Funciona',
    warranty: 'Garantía',
    myPurchases: 'Mis Compras',
    regionLabel: 'Región'
  },
  ES: {
    trends: 'Tendencias',
    howItWorks: 'Cómo Funciona',
    warranty: 'Garantía',
    myPurchases: 'Mis Compras',
    regionLabel: 'Región'
  },
  BR: {
    trends: 'Tendências',
    howItWorks: 'Como Funciona',
    warranty: 'Garantia',
    myPurchases: 'Minhas Compras',
    regionLabel: 'Região'
  },
  US: {
    trends: 'Trends',
    howItWorks: 'How it Works',
    warranty: 'Guarantee',
    myPurchases: 'My Orders',
    regionLabel: 'Region'
  }
};

interface NavbarProps {
  countryCode: string; // Recibimos "CL", "BR", "ES", "US"
}

export default function Navbar({ countryCode = 'CL' }: NavbarProps) {
  // Obtenemos los textos según el país, fallback a Inglés si el país no está mapeado
  const t = TRANSLATIONS[countryCode.toUpperCase()] || TRANSLATIONS.US;
  const flagCode = countryCode.toLowerCase();

  return (
    <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo & Region Section -> Envuelto en Link para volver a Home */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-violet-600 p-2 rounded-xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-violet-500/20">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black tracking-tighter text-white uppercase italic">
                RAVS<span className="text-violet-500">STORE</span>
              </span>
              
              <div className="flex items-center gap-2">
                <Globe className="w-2.5 h-2.5 text-slate-500" />
                <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                  <img 
                    src={`https://flagcdn.com/w20/${flagCode}.png`} 
                    alt={countryCode} 
                    className="w-3.5 h-auto rounded-[1px] shadow-sm" 
                  />
                  <span>{t.regionLabel}: {countryCode}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Dynamic Menu Items -> Apuntando a los IDs de la página */}
        <div className="hidden md:flex gap-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          <a href="#tendencias" className="hover:text-violet-400 transition-colors uppercase italic">{t.trends}</a>
          <a href="#como-funciona" className="hover:text-violet-400 transition-colors uppercase italic">{t.howItWorks}</a>
          <a href="#garantia" className="hover:text-violet-400 transition-colors uppercase italic">{t.warranty}</a>
        </div>

        {/* Action Button */}
        <button className="bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-violet-600 hover:text-white transition-all duration-300 flex items-center gap-2 group shadow-xl">
          <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
          {t.myPurchases}
        </button>
      </div>
    </nav>
  );
}