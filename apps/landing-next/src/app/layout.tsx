import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- ¡ASEGÚRATE DE QUE ESTO ESTÉ AQUÍ!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ravstore - Tendencias con IA",
  description: "Encuentra productos ganadores analizados por inteligencia artificial",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}