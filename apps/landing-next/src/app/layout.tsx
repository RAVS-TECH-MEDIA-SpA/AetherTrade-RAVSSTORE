import './globals.css';
import { Metadata } from 'next';
import Script from 'next/script';
import MetaPixelInit from '@/components/MetaPixelInit';

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
    url: 'https://ravsstore.com',
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
              "name": "Ravstore",
              "description": "Tienda de arbitraje inteligente y tecnología premium.",
              "url": "https://ravsstore.com",
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
          strategy="afterInteractive" 
        />

        {/* Meta Pixel - UNA SOLA VEZ */}
        {pixelId && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </head>
      <body className="antialiased">
        {/* Este componente AHORA solo debe hacer ensureFbcFromUrl() */}
        <MetaPixelInit />
        
        {children}

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