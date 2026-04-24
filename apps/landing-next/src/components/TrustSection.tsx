// apps/landing-next/src/components/TrustSection.tsx
import { ShieldCheck, Truck, CreditCard } from 'lucide-react';

export const TrustSection = () => {
  return (
    <section className="py-20 bg-slate-950 border-t border-slate-900">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center text-violet-500 mb-6">
              <CreditCard size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Pago Seguro</h4>
            <p className="text-slate-400">Paga con tus tarjetas de débito o crédito a través de <strong>Webpay Plus / Transbank</strong>.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6">
              <Truck size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Envío Regional</h4>
            <p className="text-slate-400">Despachos rápidos a todo el país. Especial atención en la <strong>Región del Biobío</strong>.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6">
              <ShieldCheck size={32} />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Garantía Ravstore</h4>
            <p className="text-slate-400">Todos nuestros productos son testeados antes de ser recomendados por nuestra IA.</p>
          </div>
        </div>
      </div>
    </section>
  );
};