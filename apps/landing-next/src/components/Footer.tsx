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
                © {currentYear} Ravstore {countryCode} Division
              </p>
              <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">
                Tecnología Global • Respaldo Local • Impulsado por IA
              </p>
            </div>
          </div>

          {/* LADO DERECHO: PAGOS Y LINKS */}
          <div className="flex flex-col items-center md:items-end gap-10">
            
            {/* MÉTODOS DE PAGO (Visibles para generar confianza) */}
            <div className="flex flex-wrap justify-center md:justify-end items-center gap-8 opacity-80 hover:opacity-100 transition-opacity">
              <img src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" className="h-2.5 w-auto" alt="Visa" />
              <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo.png" className="h-5 w-auto" alt="Mastercard" />
              
              {/* Mercado Pago */}
              <img src="https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0.png" className="h-4 w-auto" alt="Mercado Pago" />
              
              {countryCode === 'CL' && (
                <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-4 w-auto" alt="Webpay" />
              )}
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