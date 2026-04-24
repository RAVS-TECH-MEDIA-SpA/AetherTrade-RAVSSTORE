// apps/landing-next/src/app/page.tsx
import { pool } from '@/lib/db';
import { Hero } from '@/components/Hero';
import { ProductCard } from '@/components/ProductCard';

async function getProducts() {
  const query = `
    SELECT * FROM products 
    WHERE status = 'WINNER' 
    ORDER BY created_at DESC 
    LIMIT 12
  `;
  const res = await pool.query(query);
  return res.rows;
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="bg-white min-h-screen">
      <Hero />
      
      <section className="py-16 container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900">
            🔥 Tendencias Recién Detectadas
          </h2>
          <div className="hidden md:flex gap-4">
            {/* Logos de pago para generar confianza inmediata */}
            <img src="/logos/webpay.png" alt="Webpay Plus" className="h-8 grayscale opacity-70" />
            <img src="/logos/transbank.png" alt="Transbank" className="h-8 grayscale opacity-70" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Banner de urgencia para el comprador */}
      <div className="bg-amber-50 border-y border-amber-100 py-4 text-center">
        <p className="text-amber-800 font-medium">
          🚀 ¡Ojo! Nuestra IA detectó stock limitado para estos productos. Despacho prioritario a la Región del Biobío.
        </p>
      </div>
    </div>
  );
}