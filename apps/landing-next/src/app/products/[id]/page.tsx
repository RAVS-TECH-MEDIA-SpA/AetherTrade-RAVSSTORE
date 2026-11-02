import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductByAliId } from '@/lib/api';
// ⚡ IMPORTANTE: Verifica que esta ruta apunte a tu cliente de Supabase configurado
import { supabase } from '@/lib/supabaseClient'; 
import ProductGalleryWrapper from '@/components/ui/ProductGalleryWrapper';
import ViewContentTracker from './components/ViewContentTracker';

interface Props {
  params: Promise<{ id: string }>;
}

// Función auxiliar interna para limpiar los emojis pegados al ID
function cleanId(rawId: string): string {
  // Se queda estrictamente con caracteres de UUID (letras, números y guiones).
  // Ignora cualquier emoji o texto codificado (%F0%9F...) que venga al final.
  const match = rawId.match(/^[a-zA-Z0-9-]+/);
  return match ? match[0] : rawId;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = cleanId(rawId); // 🛠️ Limpiamos el ID antes de consultar la API
  
  const product = await getProductByAliId(id);
  if (!product) return { title: 'Producto no encontrado' };
  return { title: `${product.marketing_copy?.title_localized || product.title_original} | Aether Trade` };
}

export default async function ProductPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = cleanId(rawId); // 🛠️ Limpiamos el ID antes de procesar el producto

  const product = await getProductByAliId(id);

  if (!product) notFound();

  // ⚡ NUEVO: Buscamos si este producto tiene una guía digital asociada y lista (con PDF)
  let guiaDigital = null;
  try {
    const { data: guia } = await supabase
      .from('guias_digitales')
      .select('*')
      .eq('product_id', product.id)
      .not('storage_url', 'is', null) // Solo traemos guías que ya tienen el PDF subido a GCP
      .single();
      
    if (guia) {
      guiaDigital = guia;
    }
  } catch (error) {
    // Es normal que falle silenciosamente si el producto no tiene guía, no rompemos la página
    console.log(`Sin guía digital para el producto: ${product.id}`);
  }

  // Sincronizamos el precio que enviaremos a Meta Ads aplicando el mismo redondeo
  const basePrice = Number(product.suggested_price_local) || 0;
  const roundedPriceLocal = Math.ceil(basePrice / 100) * 100 - 10;

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
      
      {/* Inyectamos el Pixel Tracker de forma invisible con el precio redondeado */}
      <ViewContentTracker 
        product={{
          id: String(product.id), 
          suggested_price_local: roundedPriceLocal,
          title: product.marketing_copy?.title_localized || product.title_original
        }} 
      />

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24">
        {/* ⚡ NUEVO: Le pasamos la guía digital encontrada al componente visual */}
        <ProductGalleryWrapper product={product} guiaDigital={guiaDigital} />
      </div>
    </main>
  );
}
