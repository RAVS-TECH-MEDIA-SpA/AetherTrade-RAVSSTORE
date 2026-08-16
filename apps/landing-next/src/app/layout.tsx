import './globals.css';
import { Metadata } from 'next';
import Script from 'next/script';
import MetaPixelInit from '@/components/MetaPixelInit';

export const metadata: Metadata = {
  title: {
    default: 'RavsStore | Gadgets Premium e Importación Directa en Chile',
    template: '%s | RavsStore'
  },
  description: 'Descubre las últimas tendencias tecnológicas globales con envío gratis a todo Chile. Calidad verificada por IA. Compra segura con Webpay y Mercado Pago. ¡Explora gadgets virales y productos de importación directa hoy!',
  keywords: ['tecnología chile', 'gadgets virales', 'importación directa', 'compras seguras webpay', 'tienda tech biobio', 'despacho gratis'],
  authors: [{ name: 'RavsStore Team' }],
  creator: 'RavsStore',
  icons: {
    icon: '/assets/favicon/favicon.svg',
    apple: '/assets/favicon/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://ravsstore.com',
    siteName: 'RavsStore',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'RavsStore - Lo mejor del mundo en Chile'
    }],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID; // <-- USA SOLO ESTE NOMBRE

  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "OnlineStore",
              "name": "RavsStore",
              "description": "Tienda de arbitraje inteligente y tecnología premium.",
              "url": "https://ravsstore.com",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Concepción",
                "addressRegion": "Biobío",
                "addressCountry": "CL"
              }
            })
          }}
        />
        
       
        {/* Meta Pixel - CORREGIDO PARA EVITAR SSR RUNTIME ERROR */}
        {pixelId && (
          <>
            <Script
              id="fb-pixel-base"
              src="https://facebook.net"
              strategy="afterInteractive"
            />
            <Script id="fb-pixel-init" strategy="afterInteractive">
              {`
                window.fbq = window.fbq || function() {
                  (window.fbq.q = window.fbq.q || []).push(arguments);
                };
                window._fbq = window._fbq || window.fbq;
                fbq.push = fbq;
                fbq.loaded = true;
                fbq.version = '2.0';
                fbq.queue = [];
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="antialiased">
        {/* Este componente AHORA solo debe hacer ensureFbcFromUrl() */}
        <MetaPixelInit />
        
        {children}

        <Script
          src="https://googletagmanager.com"
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
