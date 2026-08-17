// apps/landing-next/src/components/ui/ProductTrustLogistics.tsx
import React from 'react';
import { ShieldCheck, Box, Calendar } from 'lucide-react';

export const ProductTrustLogistics = ({ product }: { product: any }) => {
  // 🛡️ Mapeo según tu tabla 'products'
  const delivery = product?.raw_details?.delivery || {};
  
  // El peso sí tiene columna propia en tu tabla: weight_kg
  const weight = product?.weight_kg || product?.raw_details?.logistics?.weight || '0.5';
  const dimensions = product?.raw_details?.logistics?.dimensions || { l: 15, w: 10, h: 5 };

  return (
    // ⚡ Contenedor Flex para mobile (carrusel) y Grid para Desktop
    <div className="flex gap-4 overflow-x-auto md:grid md:grid-cols-3 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden my-6 md:my-8 pb-4 md:pb-0">
      
      {/* 📦 CARD: ENTREGA */}
      <div className="snap-center shrink-0 w-[85%] sm:w-[45%] md:w-auto p-5 md:p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-md flex flex-col justify-center">
        <div className="flex items-center gap-3 text-violet-400 mb-3 md:mb-4">
          <div className="p-2 bg-violet-400/10 rounded-lg">
            <Calendar size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Entrega Estimada</span>
        </div>
        <p className="text-base md:text-lg font-bold text-white leading-tight capitalize">
          {/* ⚡ USAMOS LA NUEVA FECHA DINÁMICA CALCULADA POR EL FRONTEND */}
          {product?.calculated_estimated_delivery || 'Envío Internacional'}
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
          {delivery.isFree || product?.shipping_cost_usd === 0 ? '🚀 Envío Gratis' : 'Logística Asegurada'}
        </p>
      </div>

      {/* 📏 CARD: FICHA FÍSICA */}
      <div className="snap-center shrink-0 w-[85%] sm:w-[45%] md:w-auto p-5 md:p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-md flex flex-col justify-center">
        <div className="flex items-center gap-3 text-emerald-400 mb-3 md:mb-4">
          <div className="p-2 bg-emerald-400/10 rounded-lg">
            <Box size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dimensiones</span>
        </div>
        <p className="text-base md:text-lg font-bold text-white leading-tight">
           {weight} kg <span className="text-slate-500 text-xs md:text-sm font-medium italic">aprox.</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
          {dimensions.l}x{dimensions.w}x{dimensions.h} cm
        </p>
      </div>

      {/* 🛡️ CARD: CONFIANZA (REMASTERIZADA PARA RAVSSTORE) */}
      <div className="snap-center shrink-0 w-[85%] sm:w-[45%] md:w-auto p-5 md:p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-md flex flex-col justify-center">
        <div className="flex items-center gap-3 text-amber-400 mb-3 md:mb-4">
          <div className="p-2 bg-amber-400/10 rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Seguridad</span>
        </div>
        <p className="text-base md:text-lg font-bold text-white truncate leading-tight">
          Compra Protegida
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
          Respaldo Total RAVSSTORE
        </p>
      </div>

    </div>
  );
};