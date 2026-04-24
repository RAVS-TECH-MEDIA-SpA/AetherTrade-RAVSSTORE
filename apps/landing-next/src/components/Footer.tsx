// apps/landing-next/src/components/Footer.tsx
import { ShieldCheck, Truck, CreditCard } from 'lucide-react';

export const Footer = () => (
  <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-10">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 text-center md:text-left">
        <div className="space-y-4">
          <ShieldCheck className="w-8 h-8 text-violet-500 mx-auto md:mx-0" />
          <h4 className="font-bold text-white">Pago Seguro</h4>
          <p className="text-slate-400 text-sm">Transacciones cifradas vía Webpay Plus. Compra con total tranquilidad.</p>
        </div>
        <div className="space-y-4">
          <Truck className="w-8 h-8 text-violet-500 mx-auto md:mx-0" />
          <h4 className="font-bold text-white">Envío a Todo Chile</h4>
          <p className="text-slate-400 text-sm">Logística optimizada para entregas rápidas en Biobío y regiones.</p>
        </div>
        <div className="space-y-4">
          <CreditCard className="w-8 h-8 text-violet-500 mx-auto md:mx-0" />
          <h4 className="font-bold text-white">Cuotas Sin Interés</h4>
          <p className="text-slate-400 text-sm">Paga hasta en 12 cuotas con tus tarjetas de crédito bancarias.</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-900 pt-8">
        <p className="text-slate-500 text-sm">© 2026 Ravstore Chile. Impulsado por IA.</p>
        <div className="flex gap-4 grayscale opacity-50">
          <img src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" className="h-4" />
          <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo.png" className="h-6" />
          <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-6" />
        </div>
      </div>
    </div>
  </footer>
);