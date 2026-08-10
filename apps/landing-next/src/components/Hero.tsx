'use client';
import { motion } from 'framer-motion';
import { ShoppingBag, Zap } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Efecto de fondo: Gradiente animado */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent)]" />
      
      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-400 text-sm font-medium border border-violet-500/20 mb-6 inline-block">
            Impulsado por Inteligencia Artificial 🤖
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Descubre Tendencias <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Antes que Nadie
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            En RavsStore no vendemos de todo. Vendemos lo que el mundo está comprando hoy, 
            analizado y curado por nuestra IA para garantizarte la mejor calidad.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20">
              <ShoppingBag size={20} /> Ver Ofertas de Hoy
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700">
              ¿Cómo funciona?
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};