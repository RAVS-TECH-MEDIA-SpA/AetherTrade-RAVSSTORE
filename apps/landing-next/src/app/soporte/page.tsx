import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Metadata } from 'next';
import { Mail, MessageCircle, HelpCircle, ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Centro de Soporte',
  description: 'Asistencia premium para tus compras. Estamos aquí para ayudarte.',
};

export default function SupportPage() {
  const countryCode = 'CL';

  const faqs = [
    {
      question: "¿Cuánto tiempo tarda en llegar mi pedido?",
      answer: "Trabajamos con importación directa desde nuestros proveedores globales (Drop-shipping automatizado). Por lo general, los tiempos de entrega varían entre 7 a 15 días hábiles. Todos nuestros envíos incluyen número de seguimiento para tu tranquilidad."
    },
    {
      question: "¿Cómo recibo mi boleta y mis guías digitales?",
      answer: "¡Todo es automático! Una vez que se aprueba tu pago, nuestro sistema emite inmediatamente tu Boleta Electrónica oficial (SII) y te la envía al correo junto con un enlace seguro para descargar tu Guía Digital Premium."
    },
    {
      question: "¿Qué métodos de pago aceptan?",
      answer: "Procesamos todos los pagos a través de Mercado Pago, lo que garantiza máxima seguridad. Puedes pagar con Tarjetas de Crédito, Débito (Webpay) o saldo en tu cuenta de Mercado Pago."
    },
    {
      question: "¿Qué pasa si mi producto llega con problemas?",
      answer: "Tienes nuestra Garantía RAVSStore. Si tu producto llega dañado o no es lo que pediste, contáctanos a soporte@ravsstore.com o a nuestro WhatsApp con tu número de orden y fotos del producto para gestionar un reembolso o reemplazo."
    }
  ];

  return (
    <>
      <Navbar countryCode={countryCode} />
      <main className="min-h-screen bg-[#020617] pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* Header */}
          <header className="text-center space-y-4">
            <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter text-white">
              Soporte <span className="text-violet-500 text-stroke">Premium</span>
            </h1>
            <p className="text-slate-500 uppercase text-xs font-black tracking-[0.3em]">Resolución de incidencias global-local</p>
          </header>

          {/* Cards de Contacto */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center group hover:border-violet-500/30 transition-all cursor-pointer">
              <Mail className="w-10 h-10 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-xl mb-4">Email</h3>
              <p className="text-slate-400 text-sm">soporte@ravsstore.com</p>
            </div>

            <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center group hover:border-violet-500/30 transition-all cursor-pointer">
              <MessageCircle className="w-10 h-10 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-xl mb-4">WhatsApp</h3>
              <p className="text-slate-400 text-sm">+56 9 XXXX XXXX</p>
            </div>

            <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center group hover:border-violet-500/30 transition-all cursor-pointer">
              <HelpCircle className="w-10 h-10 text-violet-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-bold text-xl mb-4">Preguntas</h3>
              <p className="text-slate-400 text-sm">Respuestas inmediatas</p>
            </div>
          </div>

          {/* Sección de FAQs */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-white text-center mb-8">Preguntas Frecuentes</h2>
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-slate-900/40 border border-white/5 rounded-2xl open:bg-slate-900/80 transition-all">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-semibold text-white">
                  {faq.question}
                  <ChevronDown className="w-5 h-5 text-violet-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>

          {/* Rastreador Box */}
          <div className="bg-violet-600/5 border border-violet-500/20 rounded-[3rem] p-12 text-center max-w-3xl mx-auto">
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