'use client';

interface QuantitySelectorProps {
  value: number;
  onChange: (val: number) => void;
}

export function QuantitySelector({ value, onChange }: QuantitySelectorProps) {
  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-1 h-16 shadow-inner">
      <button 
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-14 h-full flex items-center justify-center text-slate-500 hover:text-white transition-all text-3xl font-black"
      > – </button>
      <span className="text-2xl font-black text-white w-12 text-center tabular-nums">{value}</span>
      <button 
        onClick={() => onChange(value + 1)}
        className="w-14 h-full flex items-center justify-center text-slate-500 hover:text-white transition-all text-3xl font-black"
      > + </button>
    </div>
  );
}