// apps/landing-next/src/components/ui/ProductTrustLogistics.tsx
import React from 'react';
import { ShieldCheck, Box, Calendar } from 'lucide-react';

export const ProductTrustLogistics = ({ product }: { product: any }) => {
  // 🛡️ Mapeo según tu captura de tabla 'products'
  // Extraemos de raw_details donde el worker guarda la data cruda de la API
  const delivery = product?.raw_details?.delivery || {};
  const trust = product?.raw_details?.trust || {};
  
  // El peso sí tiene columna propia en tu tabla: weight_kg
  const weight = product?.weight_kg || product?.raw_details?.logistics?.weight || '0.5';
  const dimensions = product?.raw_details?.logistics?.dimensions || { l: 15, w: 10, h: 5 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
      
      {/* CARD: ENTREGA */}
      <div className="p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 text-violet-400 mb-4">
          <div className="p-2 bg-violet-400/10 rounded-lg">
            <Calendar size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Entrega Gratis</span>
        </div>
        <p className="text-lg font-bold text-white leading-tight">
          {delivery.estimateDate 
            ? new Date(delivery.estimateDate).toLocaleDateString('es-CL', { month: 'long', day: 'numeric' })
            : 'Envío Internacional'}
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
          {delivery.isFree || product.shipping_cost_usd === 0 ? '🚀 Envío Gratis' : 'Logística Asegurada'}
        </p>
      </div>

      {/* CARD: FICHA FÍSICA */}
      <div className="p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 text-emerald-400 mb-4">
          <div className="p-2 bg-emerald-400/10 rounded-lg">
            <Box size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Dimensiones</span>
        </div>
        <p className="text-lg font-bold text-white leading-tight">
           {weight} kg <span className="text-slate-500 text-sm font-medium italic">aprox.</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
          {dimensions.l}x{dimensions.w}x{dimensions.h} cm
        </p>
      </div>

      {/* CARD: CONFIANZA */}
      <div className="p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 text-amber-400 mb-4">
          <div className="p-2 bg-amber-400/10 rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Seguridad</span>
        </div>
        <p className="text-lg font-bold text-white truncate leading-tight">
          {'Tienda Verificada'}
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
          {trust.isOfficial ? '⭐ Tienda Oficial' : `Antigüedad: ${trust.storeAge ? `${trust.storeAge} Años` : '1+ Año'}`}
        </p>
      </div>

    </div>
  );
};