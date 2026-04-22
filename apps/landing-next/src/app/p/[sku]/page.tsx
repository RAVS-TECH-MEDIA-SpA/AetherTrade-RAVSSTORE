import { Metadata } from 'next';
import { notFound } from 'next/navigation';

async function getProduct(sku: string) {
  // Aquí llamarías a tu API Gateway o directo a la DB
  const res = await fetch(`https://api.aethertrade.com/v1/products/${sku}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: { sku: string } }): Promise<Metadata> {
  const product = await getProduct(params.sku);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: product.ai_content.title,
    description: product.ai_content.description,
    openGraph: { images: [product.images[0]] }
  };
}

export default async function ProductPage({ params }: { params: { sku: string } }) {
  const product = await getProduct(params.sku);
  if (!product) notFound();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="grid md:grid-cols-2 gap-8">
        <img src={product.images[0]} alt={product.title} className="rounded-lg shadow-lg" />
        
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">{product.ai_content.title}</h1>
          <p className="text-2xl text-green-600 font-semibold">{product.price} EUR</p>
          <p className="text-gray-600">{product.ai_content.description}</p>
          
          <form action="/api/checkout" method="POST">
            <input type="hidden" name="sku" value={product.sku} />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition">
              COMPRAR AHORA
            </button>
          </form>
          
          <div className="mt-4 border-t pt-4 text-sm text-gray-500">
            ✅ Envío garantizado a Europa (7-12 días) | Pago Seguro SSL
          </div>
        </div>
      </div>
    </main>
  );
}