import { pool } from '@/lib/db';
import { Hero } from '@/components/Hero';
import { TrustSection } from '@/components/TrustSection';
import { ProductCard } from '@/components/ProductCard';

// Esta función corre solo en el servidor
async function getWinners() {
  try {
    const res = await pool.query(
      "SELECT * FROM products WHERE status = 'WINNER' ORDER BY created_at DESC LIMIT 20"
    );
    return res.rows;
  } catch (error) {
    console.error("❌ Error fetch DB:", error);
    return [];
  }
}

export default async function Home() {
  const products = await getWinners();

  return (
    <main className="min-h-screen bg-[#020617]">
      <Hero />
      <TrustSection />
      
      <section className="container mx-auto px-6 py-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Tendencias de Hoy</h2>
            <p className="text-slate-400">Productos analizados con IA listos para importar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.length > 0 ? (
            products.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-3xl">
              <p className="text-slate-500">Buscando nuevos ganadores... lanza el worker en GCP!</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}