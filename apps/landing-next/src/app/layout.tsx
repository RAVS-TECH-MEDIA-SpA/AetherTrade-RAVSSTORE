import { Suspense } from 'react';
import './globals.css';
import { Metadata } from 'next';
import Script from 'next/script';
import MetaPixelInit from '@/components/MetaPixelInit';
import NextTopLoader from 'nextjs-toploader';
import SalesAssistant from '@/components/SalesAssistant';

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
        <meta name="facebook-domain-verification" content="tpj9r0g3h1371lt6h4pqmyjt3c553m" />
      </head>
      <body className="antialiased">
        <NextTopLoader
          color="#3B82F6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
          shadow="0 0 10px #3B82F6,0 0 5px #3B82F6"
        />

       {/* ⚡ FIX: Envolvemos en Suspense para evitar el error de build en páginas estáticas */}
        <Suspense fallback={null}>
          <MetaPixelInit />
        </Suspense>
        
        {children}
        <SalesAssistant countryCode="CL" storeName="RAVSSTORE" />

        <Script src="https://googletagmanager.com" strategy="afterInteractive" />
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