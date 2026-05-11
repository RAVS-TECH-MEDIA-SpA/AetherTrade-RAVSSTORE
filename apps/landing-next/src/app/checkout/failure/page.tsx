import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function FailurePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-slate-900/50 border border-red-500/30 p-12 rounded-[3rem] text-center backdrop-blur-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-red-500/20 p-4 rounded-full">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
          Pago <span className="text-red-500">Cancelado</span>
        </h1>
        <p className="text-slate-400 mb-10">
          Hubo un problema con la transacción o fue cancelada. No se ha realizado ningún cargo.
        </p>
        <Link 
          href="/" 
          className="block w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all"
        >
          Reintentar Compra
        </Link>
      </div>
    </div>
  );
}