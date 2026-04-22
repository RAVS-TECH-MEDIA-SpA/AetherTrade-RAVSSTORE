import React from 'react';

export const metadata = {
  title: 'Ravstore | Arbitraje Inteligente',
  description: 'Próximamente: Innovación para el mercado Global',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}