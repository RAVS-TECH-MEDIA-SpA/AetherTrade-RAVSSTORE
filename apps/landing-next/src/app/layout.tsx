import './globals.css'; // <--- VITAL
import { Metadata } from 'next';
import Script from 'next/script'; // <--- Importamos el componente de Script

export const metadata: Metadata = {
  title: {
    default: 'Ravstore | Gadgets Premium e Importación Directa en Chile',
    template: '%s | Ravstore'
  },
  description: 'Descubre las últimas tendencias tecnológicas globales con envío gratis a todo Chile. Calidad verificada por IA y respaldo local en la Región del Biobío.',
  keywords: ['tecnología chile', 'gadgets virales', 'importación directa', 'compras seguras webpay', 'tienda tech biobio', 'despacho gratis'],
  authors: [{ name: 'Ravstore Team' }],
  creator: 'Ravstore',
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://ravstore.vercel.app',
    siteName: 'Ravstore',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'Ravstore - Lo mejor del mundo en Chile'
    }],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        {/* JSON-LD para Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "OnlineStore",
              "name": "Ravstore",
              "description": "Tienda de arbitraje inteligente y tecnología premium.",
              "url": "https://ravstore.vercel.app",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Cabrero",
                "addressRegion": "Biobío",
                "addressCountry": "CL"
              }
            })
          }}
        />
        <Script 
          src="https://sdk.mercadopago.com/js/v2" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="antialiased">
        {children}

        {/* --- Google Analytics (gtag.js) --- */}
        {/* Carga el script de forma asíncrona después de que la página sea interactiva */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5KQSNBQZBV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-5KQSNBQZBV');
          `}
        </Script>
      </body>
    </html>
  );
}