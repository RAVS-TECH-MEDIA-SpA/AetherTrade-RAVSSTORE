import { ShieldCheck, Truck, CreditCard } from 'lucide-react';

interface TrustSectionProps {
  countryCode: string;
}

export default function TrustSection({ countryCode }: TrustSectionProps) {
  const content = {
    CL: { shipping: 'Envío a Todo Chile', region: 'Entregas rápidas en Santiago y regiones.' },
    CA: { shipping: 'Canada Wide Shipping', region: 'Fast delivery from Toronto to Vancouver.' },
    US: { shipping: 'Fast USA Shipping', region: 'Standard 3-5 day delivery nationwide.' },
    ES: { shipping: 'Envío a Toda España', region: 'Logística optimizada para Península e Islas.' }
  }[countryCode] || { shipping: 'Global Shipping', region: 'Fast international delivery.' };

  return (
    <section className="container mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-3xl backdrop-blur-sm group hover:border-violet-500/50 transition-colors">
          <ShieldCheck className="w-10 h-10 text-violet-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-black text-white uppercase text-sm tracking-tight mb-2">Pago 100% Seguro</h4>
          <p className="text-slate-400 text-xs leading-relaxed">
            {/* Transacciones cifradas de extremo a extremo. Compra con total tranquilidad en {countryCode}. */}
            Transacciones cifradas de extremo a extremo. Compra con total tranquilidad en Chile.

          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-3xl backdrop-blur-sm group hover:border-violet-500/50 transition-colors text-violet-400 shadow-2xl shadow-violet-500/5">
          <Truck className="w-10 h-10 text-violet-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-black text-white uppercase text-sm tracking-tight mb-2">{content.shipping}</h4>
          <p className="text-slate-400 text-xs leading-relaxed">{content.region}</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-3xl backdrop-blur-sm group hover:border-violet-500/50 transition-colors">
          <CreditCard className="w-10 h-10 text-violet-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-black text-white uppercase text-sm tracking-tight mb-2">Cuotas Sin Interés</h4>
          <p className="text-slate-400 text-xs leading-relaxed">
            Facilidades de pago con tarjetas bancarias locales.
          </p>
        </div>
      </div>
    </section>
  );
}