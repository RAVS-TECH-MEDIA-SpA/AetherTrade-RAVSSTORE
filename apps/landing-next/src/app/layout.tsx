import './globals.css'; // <--- ESTA LÍNEA ES VITAL
import { Metadata } from 'next';

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
      url: '/og-image.jpg', // Crea una imagen de 1200x630
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
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}