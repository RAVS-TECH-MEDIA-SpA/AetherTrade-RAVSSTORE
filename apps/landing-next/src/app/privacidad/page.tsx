import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacidad y Datos',
  description: 'Cómo protegemos tu información y garantizamos transacciones seguras en RavsStore.',
};

export default function PrivacyPage() {
  const countryCode = 'CL';

  return (
    <>
      <Navbar countryCode={countryCode} />
      <main className="min-h-screen bg-[#020617] pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/40 border border-white/5 p-12 lg:p-16 rounded-[3rem] backdrop-blur-xl">
            <header className="flex flex-col items-center text-center mb-16">
              <ShieldCheck className="w-16 h-16 text-violet-500 mb-6" />
              <h1 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                Privacidad <br /> <span className="text-violet-500">Blindada</span>
              </h1>
            </header>

            <div className="space-y-8 text-slate-400">
              <h2 className="text-white font-black uppercase text-sm tracking-widest border-l-4 border-violet-600 pl-4">Protección de Datos</h2>
              <p>
                En RavsStore, no vendemos tu información. Utilizamos encriptación de grado militar para procesar tus pedidos 
                y asegurar que tu experiencia de compra global sea 100% privada.
              </p>

              <h2 className="text-white font-black uppercase text-sm tracking-widest border-l-4 border-violet-600 pl-4">Seguridad en Pagos</h2>
              <p>
                Tus datos bancarios nunca se almacenan en nuestros servidores. Todas las transacciones se realizan a través de 
                pasarelas certificadas como Webpay Plus y Mercado Pago, cumpliendo con el estándar PCI-DSS.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer countryCode={countryCode} />
    </>
  );
}