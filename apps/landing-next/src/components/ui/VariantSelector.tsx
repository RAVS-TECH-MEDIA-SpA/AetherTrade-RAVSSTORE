'use client';

export default function VariantSelector({ variants, selectedId, onSelect }: any) {
  // Agrupamos por color para mostrar miniaturas si hay
  const colors = Array.from(new Set(variants.map((v: any) => v.color))).filter(Boolean);
  const sizes = Array.from(new Set(variants.map((v: any) => v.size))).filter(Boolean);

  return (
    <div className="space-y-8">
      {colors.length > 0 && (
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleccionar Color</label>
          <div className="flex flex-wrap gap-3">
            {variants.filter((v: any) => v.color).map((v: any) => (
              <button
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`group relative h-16 w-16 rounded-xl border-2 transition-all overflow-hidden ${
                  selectedId === v.id ? 'border-violet-600 scale-105' : 'border-white/5 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={v.image_url} alt={v.color} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Talla / Especificación</label>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s: any) => (
              <button
                key={s as string}
                onClick={() => onSelect(variants.find((v: any) => v.size === s)?.id)}
                className={`px-6 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  variants.find((v: any) => v.id === selectedId)?.size === s 
                  ? 'border-white bg-white text-black' 
                  : 'border-white/10 text-slate-400 hover:border-white/30'
                }`}
              >
                {s as string}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}