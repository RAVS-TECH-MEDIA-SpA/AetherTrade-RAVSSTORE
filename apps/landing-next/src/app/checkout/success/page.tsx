import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-slate-900/50 border border-emerald-500/30 p-12 rounded-[3rem] text-center backdrop-blur-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-500/20 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
          ¡Pago <span className="text-emerald-500">Exitoso!</span>
        </h1>
        <p className="text-slate-400 mb-10">
          Tu orden ha sido procesada. Recibirás un correo con los detalles de tu importación en breve.
        </p>
        <Link 
          href="/" 
          className="block w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
        >
          Volver a la Tienda
        </Link>
      </div>
    </div>
  );
}