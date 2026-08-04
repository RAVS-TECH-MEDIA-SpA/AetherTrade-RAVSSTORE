import { ShieldCheck, Zap, RefreshCcw } from 'lucide-react';

export const Warranty = () => (
  <section id="garantia" className="py-32 bg-black relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

    <div className="max-w-5xl mx-auto px-6 relative z-10">
      <div className="bg-slate-900/40 border border-white/10 p-12 lg:p-20 rounded-[4rem] backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="p-4 bg-violet-500 rounded-3xl shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
            Tu Confianza es <br /> <span className="text-violet-500">Nuestra Prioridad</span>
          </h2>
          
          <p className="text-slate-400 text-lg max-w-2xl font-medium">
            RavsStore Chile combina la innovación internacional con la seguridad local. 
            Todas tus compras están protegidas por estándares de garantía chilenos y soporte técnico especializado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 border-t border-white/5">
            <div className="flex items-center gap-3 justify-center text-[10px] font-black text-white uppercase tracking-[0.2em]">
              <Zap className="text-violet-500 w-4 h-4" /> Pago Seguro por MercadoPago
            </div>
            <div className="flex items-center gap-3 justify-center text-[10px] font-black text-white uppercase tracking-[0.2em]">
              <ShieldCheck className="text-violet-500 w-4 h-4" /> Garantía en Chile
            </div>
            <div className="flex items-center gap-3 justify-center text-[10px] font-black text-white uppercase tracking-[0.2em]">
              <RefreshCcw className="text-violet-500 w-4 h-4" /> Soporte 24/7
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);