'use client';

// ⚡ Actualizamos la interfaz para aceptar tanto Arrays (AliExpress) como Strings HTML (CJ)
export default function TechnicalFeatures({ attributes }: { attributes?: any[] | string }) {
  if (!attributes || (Array.isArray(attributes) && attributes.length === 0)) return null;

  return (
    <section className="space-y-6 py-10 border-t border-white/5">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Especificaciones Técnicas</h3>
      
      {typeof attributes === 'string' ? (
        /* ⚡ RENDERIZADO SEGURO PARA HTML DE CJ DROPSHIPPING */
        <div 
          className="text-sm text-slate-400 leading-relaxed 
                     [&_b]:text-slate-200 [&_b]:font-bold [&_b]:tracking-wide
                     [&_p]:mb-4 
                     [&_img]:w-full [&_img]:max-w-3xl [&_img]:mx-auto [&_img]:rounded-3xl [&_img]:border [&_img]:border-white/5 [&_img]:my-6 [&_img]:shadow-2xl [&_img]:bg-slate-900
                     [&_div]:flex [&_div]:flex-col [&_div]:items-center [&_div]:w-full"
          dangerouslySetInnerHTML={{ __html: attributes }}
        />
      ) : (
        /* ⚡ FALLBACK: LÓGICA ORIGINAL PARA ARRAY DE ALIEXPRESS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {attributes.map((attr, i) => (
            <div key={i} className="flex justify-between items-baseline border-b border-white/5 pb-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase">{attr.name}</span>
              <span className="text-sm text-slate-200 font-medium text-right ml-4">{attr.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}