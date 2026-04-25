interface FooterProps {
  countryCode: string;
}

export default function Footer({ countryCode }: FooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-950 border-t border-slate-900/50 pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <span className="text-2xl font-black tracking-tighter text-white">
              RAV<span className="text-violet-500">STORE</span>
            </span>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
              © {currentYear} Ravstore {countryCode} Division • Impulsado por IA
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-6">
            <div className="flex items-center gap-6 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <img src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" className="h-3" alt="Visa" />
              <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo.png" className="h-5" alt="Mastercard" />
              {countryCode === 'CL' && (
                <img src="https://www.transbank.cl/documents/20121/0/WebpayPlus_800px.png" className="h-5" alt="Webpay" />
              )}
            </div>
            <div className="flex gap-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
              <a href="#" className="hover:text-white">Términos</a>
              <a href="#" className="hover:text-white">Privacidad</a>
              <a href="#" className="hover:text-white">Soporte</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}