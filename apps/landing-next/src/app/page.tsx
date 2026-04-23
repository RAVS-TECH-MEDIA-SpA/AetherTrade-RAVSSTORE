import React from 'react';

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-blue-500/30">
      {/* Círculos de luz decorativos en el fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-blue-500/10 blur-[120px] pointer-events-none" />
      
      <div className="relative max-w-3xl bg-slate-900/50 backdrop-blur-xl p-8 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-800">
        {/* Logo / Marca */}
        <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter">
          RAV<span className="text-blue-500">STORE</span>
        </h1>

        <div className="w-20 h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400 mx-auto mb-10 rounded-full" />

        {/* Mensaje Principal */}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-6 leading-tight">
          Inteligencia de Arbitraje <br/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            Europa & Sudamérica
          </span>
        </h2>

        <p className="text-slate-400 text-lg mb-12 leading-relaxed max-w-xl mx-auto">
          Estamos desplegando una red inteligente de logística y precios para conectar los mejores productos con compradores en 
          <span className="text-slate-200 font-medium"> Alemania, España, Italia</span> y ahora con foco especial en <span className="text-blue-400 font-bold">Chile 🇨🇱</span>.
        </p>

        {/* Grid de Propuesta de Valor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-12">
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
            <h3 className="font-bold text-blue-400 mb-1 flex items-center">
              <span className="mr-2">⚡</span> Algoritmo de Margen
            </h3>
            <p className="text-slate-400 text-sm">Cálculo en tiempo real de IVA, Aduanas y Arbitraje competitivo.</p>
          </div>
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
            <h3 className="font-bold text-blue-400 mb-1 flex items-center">
              <span className="mr-2">🌍</span> Envíos Prioritarios
            </h3>
            <p className="text-slate-400 text-sm">Logística optimizada para entregas en menos de 10 días.</p>
          </div>
        </div>

        {/* Contacto / Footer */}
        <div className="pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm mb-4 italic">¿Consultas comerciales o alianzas en Chile?</p>
          <a 
            href="mailto:rodrigovargassanhueza@gmail.com" 
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Contactar al Equipo
          </a>
        </div>
      </div>

      <footer className="mt-12 text-slate-500 text-xs tracking-widest uppercase">
        © 2026 RAVSTORE Global · Cabrero - Biobío · Europa
      </footer>
    </div>
  );
}