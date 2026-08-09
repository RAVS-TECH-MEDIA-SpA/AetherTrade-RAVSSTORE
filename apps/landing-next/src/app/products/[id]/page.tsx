// src/app/products/[id]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductByAliId } from '@/lib/api';
import ProductGalleryWrapper from '@/components/ui/ProductGalleryWrapper';
import ViewContentTracker from './components/ViewContentTracker';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductByAliId(id);
  if (!product) return { title: 'Producto no encontrado' };
  return { title: `${product.marketing_copy?.title_localized || product.title_original} | Aether Trade` };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductByAliId(id);

  if (!product) notFound();

  // ⚡ FIX: Sincronizamos el precio que enviaremos a Meta Ads aplicando el mismo redondeo
  const basePrice = Number(product.suggested_price_local) || 0;
  const roundedPriceLocal = Math.ceil(basePrice / 100) * 100 - 10;

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
      
      {/* ⚡ NUEVO: Inyectamos el Pixel Tracker de forma invisible con el precio redondeado */}
      <ViewContentTracker 
        product={{
          id: String(product.id), 
          suggested_price_local: roundedPriceLocal,
          title: product.marketing_copy?.title_localized || product.title_original
        }} 
      />

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
        <ProductGalleryWrapper product={product} />
      </div>
    </main>
  );
}