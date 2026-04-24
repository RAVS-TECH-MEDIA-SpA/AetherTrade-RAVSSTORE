import './globals.css'; // <--- ESTA LÍNEA ES VITAL
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ravstore - Arbitraje Inteligente',
  description: 'Tendencias detectadas por IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}