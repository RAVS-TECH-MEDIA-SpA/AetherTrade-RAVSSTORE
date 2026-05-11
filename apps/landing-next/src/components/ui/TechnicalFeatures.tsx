'use client';

export default function TechnicalFeatures({ attributes }: { attributes: any[] }) {
  if (!attributes || attributes.length === 0) return null;

  return (
    <section className="space-y-6 py-10 border-t border-white/5">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Especificaciones Técnicas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
        {attributes.map((attr, i) => (
          <div key={i} className="flex justify-between items-baseline border-b border-white/5 pb-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase">{attr.name}</span>
            <span className="text-sm text-slate-200 font-medium text-right ml-4">{attr.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}