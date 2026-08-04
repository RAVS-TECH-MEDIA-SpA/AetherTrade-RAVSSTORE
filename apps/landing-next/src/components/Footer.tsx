'use client';

import { Zap } from "lucide-react";
import Link from 'next/link';

interface FooterProps {
  countryCode: string;
}

export default function Footer({ countryCode = 'CL' }: FooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
          
          {/* LADO IZQUIERDO: BRANDING */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="flex items-center gap-3 group">
              <div className="bg-violet-600 p-2 rounded-xl group-hover:rotate-12 transition-all duration-300 shadow-lg shadow-violet-500/20">
                <Zap className="text-white w-5 h-5 fill-current" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white uppercase italic">
                RAVS<span className="text-violet-500">STORE</span>
              </span>
            </div>
            
            <div className="space-y-1 text-center md:text-left">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                © {currentYear} RavsStore {countryCode} Division
              </p>
              <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">
                Tecnología Global • Respaldo Local • Impulsado por IA
              </p>
            </div>
          </div>

          {/* LADO DERECHO: PAGOS Y LINKS */}
          <div className="flex flex-col items-center md:items-end gap-10">
            
            {/* MÉTODOS DE PAGO (Estructura Apilada) */}
            <div className="flex flex-col items-center md:items-end gap-3 opacity-80 hover:opacity-100 transition-opacity duration-300">
              
              {/* Fila Superior: Mercado Pago */}
              <div className="flex items-center justify-center h-8 md:h-10">
                <img 
                  src="/assets/medios-pago/logos/MP_RGB_HANDSHAKE_pluma_horizontal.svg" 
                  className="h-full w-auto object-contain" 
                  alt="Mercado Pago" 
                />
              </div>

              {/* Fila Inferior: Tarjetas y Webpay (Cargando desde la misma ruta local) */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
                
                {/* Visa */}
                <div className="bg-white px-3 py-1.5 rounded flex items-center justify-center h-7 md:h-8 shadow-sm">
                  <img 
                    src="/assets/medios-pago/logos/visa.svg" 
                    className="h-3 md:h-3.5 w-auto object-contain" 
                    alt="Visa" 
                    onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"; }}
                  />
                </div>

                {/* Mastercard */}
                <div className="bg-white px-3 py-1.5 rounded flex items-center justify-center h-7 md:h-8 shadow-sm">
                  <img 
                    src="/assets/medios-pago/logos/mastercard.svg" 
                    className="h-4 md:h-5 w-auto object-contain" 
                    alt="Mastercard" 
                    onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"; }}
                  />
                </div>
                
                {/* Webpay Plus (Solo CL) */}
                {countryCode === 'CL' && (
                  <div className="bg-white px-3 py-1.5 rounded flex items-center justify-center h-7 md:h-8 shadow-sm">
                    <img 
                      src="/assets/medios-pago/logos/webpay.svg" 
                      className="h-4 w-auto object-contain" 
                      alt="Webpay"
                      onError={(e) => { e.currentTarget.src = "https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png"; }} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* LINKS LEGALES */}
            <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              <Link href="/terminos" className="hover:text-violet-400 transition-colors">Términos</Link>
              <Link href="/privacidad" className="hover:text-violet-400 transition-colors">Privacidad</Link>
              <Link href="/soporte" className="hover:text-violet-400 transition-colors">Soporte</Link>
            </div>
          </div>

        </div>

        {/* LÍNEA FINAL DE CRÉDITOS */}
        <div className="mt-16 pt-8 border-t border-white/5 flex justify-center">
          <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.5em]">
            Aether Engine Version 7.4 • Global Arbitrage System
          </p>
        </div>
      </div>
    </footer>
  );
}