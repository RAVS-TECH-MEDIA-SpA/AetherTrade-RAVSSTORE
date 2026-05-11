import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Conoce el marco legal, términos de servicio y condiciones de uso de Ravstore Chile.',
  robots: 'index, follow'
};

export default function TermsPage() {
  const countryCode = 'CL'; // Podrías obtenerlo de cookies si prefieres

  return (
    <>
      <Navbar countryCode={countryCode} />
      <main className="min-h-screen bg-[#020617] pt-32 pb-20 px-6">
        <article className="max-w-4xl mx-auto prose prose-invert prose-violet">
          <header className="mb-16 border-b border-white/10 pb-8">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">
              Términos y <span className="text-violet-500">Condiciones</span>
            </h1>
            <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest mt-4">
              Última actualización: Mayo 2026 • Ravstore Global System
            </p>
          </header>

          <section className="space-y-12 text-slate-300 font-medium">
            <div>
              <h2 className="text-white text-2xl font-bold italic uppercase">1. Alcance Global y Local</h2>
              <p>
                Ravstore opera como una plataforma de arbitraje inteligente, conectando mercados globales con consumidores en Chile. 
                Al acceder a nuestra plataforma, usted acepta los términos de importación y gestión logística que nuestra tecnología optimiza.
              </p>
            </div>

            <div>
              <h2 className="text-white text-2xl font-bold italic uppercase">2. Precios y Transparencia</h2>
              <p>
                Los precios mostrados incluyen la gestión de importación y el valor del producto en moneda local (CLP). 
                Ravstore se reserva el derecho de ajustar precios según la volatilidad del mercado internacional para asegurar la viabilidad de la entrega.
              </p>
            </div>

            <div>
              <h2 className="text-white text-2xl font-bold italic uppercase">3. Propiedad Intelectual</h2>
              <p>
                El sistema de selección "Aether Engine" y todo el contenido curado por nuestra IA es propiedad exclusiva de Ravstore. 
                Queda prohibida la reproducción total o parcial del contenido para fines comerciales externos.
              </p>
            </div>
          </section>
        </article>
      </main>
      <Footer countryCode={countryCode} />
    </>
  );
}