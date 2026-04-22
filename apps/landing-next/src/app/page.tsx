import React from 'react';

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-2xl bg-white p-12 rounded-2xl shadow-xl border border-slate-100">
        {/* Logo / Marca */}
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          RAV<span className="text-blue-600">STORE</span>
        </h1>
        
        <div className="w-16 h-1 bg-blue-600 mx-auto mb-8 rounded-full"></div>

        {/* Mensaje Principal */}
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Próximamente: Innovación para el mercado Europeo
        </h2>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          Estamos preparando una selección exclusiva de productos de alta calidad con envíos rápidos a 
          <b> Alemania, España, Italia y Países Bajos</b>. Nuestro sistema inteligente de logística 
          garantiza el mejor precio y la mejor experiencia de compra.
        </p>

        {/* Detalles de confianza para PayPro Global */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8 text-sm">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-1">Pagos Seguros</h3>
            <p className="text-slate-500">Transacciones protegidas con tecnología de cifrado global.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-1">Soporte Local</h3>
            <p className="text-slate-500">Atención personalizada para cada mercado de la UE.</p>
          </div>
        </div>

        {/* Contacto (Vital para la aprobación) */}
        <div className="pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-400 mb-2 italic">
            ¿Consultas comerciales? Escríbenos:
          </p>
          <a 
            href="mailto:rodrigovargassanhueza@gmail.com" 
            className="text-blue-600 hover:underline font-medium"
          >
            rodrigovargassanhueza@gmail.com
          </a>
        </div>
      </div>

      <footer className="mt-8 text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} RAVSTORE Global. Todos los derechos reservados.
      </footer>
    </div>
  );
}