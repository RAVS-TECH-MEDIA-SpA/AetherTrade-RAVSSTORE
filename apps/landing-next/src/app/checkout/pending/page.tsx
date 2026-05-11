import Link from 'next/link';
import { Clock } from 'lucide-react';

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-slate-900/50 border border-violet-500/30 p-12 rounded-[3rem] text-center backdrop-blur-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-violet-500/20 p-4 rounded-full">
            <Clock className="w-16 h-16 text-violet-500" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
          Pago <span className="text-violet-500">Pendiente</span>
        </h1>
        <p className="text-slate-400 mb-10">
          Tu pago está siendo procesado por la entidad bancaria. Te avisaremos cuando se confirme.
        </p>
        <Link 
          href="/" 
          className="block w-full bg-violet-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all"
        >
          Ir a mi cuenta
        </Link>
      </div>
    </div>
  );
}