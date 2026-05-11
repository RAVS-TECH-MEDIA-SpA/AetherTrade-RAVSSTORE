import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Metadata } from 'next';
import { Mail, MessageCircle, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Centro de Soporte',
  description: 'Asistencia premium para tus compras internacionales. Estamos aquí para ayudarte.',
};

export default function SupportPage() {
  const countryCode = 'CL';

  return (
    <>
      <Navbar countryCode={countryCode} />
      <main className="min-h-screen bg-[#020617] pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="text-center space-y-4">
            <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter text-white">
              Soporte <span className="text-violet-500 text-stroke">Premium</span>
            </h1>
            <p className="text-slate-500 uppercase text-xs font-black tracking-[0.3em]">Resolución de incidencias global-local</p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center group hover:border-violet-500/30 transition-all">
              <Mail className="w-10 h-10 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-xl mb-4">Email</h3>
              <p className="text-slate-400 text-sm">soporte@ravstore.com</p>
            </div>

            <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center group hover:border-violet-500/30 transition-all">
              <MessageCircle className="w-10 h-10 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-xl mb-4">WhatsApp</h3>
              <p className="text-slate-400 text-sm">+56 9 XXXX XXXX</p>
            </div>

            <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center group hover:border-violet-500/30 transition-all">
              <HelpCircle className="w-10 h-10 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-xl mb-4">Preguntas</h3>
              <p className="text-slate-400 text-sm">FAQS Comunes</p>
            </div>
          </div>

          <div className="bg-violet-600/5 border border-violet-500/20 rounded-[3rem] p-12 text-center">
            <h2 className="text-white font-bold text-2xl mb-4">¿Tu pedido viene en camino?</h2>
            <p className="text-slate-400 mb-8">Usa nuestro rastreador inteligente con tu ID de orden.</p>
            <button className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-violet-500 hover:text-white transition-all">
              Rastrear Pedido
            </button>
          </div>
        </div>
      </main>
      <Footer countryCode={countryCode} />
    </>
  );
}