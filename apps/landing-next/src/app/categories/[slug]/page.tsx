// src/app/categories/[slug]/page.tsx
import { Metadata } from 'next';
import { getProductsByCategory } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const categoryName = params.slug.replace('-', ' ');
  return {
    title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} | Aether Trade`,
    description: `Explora nuestra selección de ${categoryName} seleccionada por IA.`
  };
}

export default async function CategoryPage({ params }: Props) {
  const products = await getProductsByCategory(params.slug);

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-black capitalize text-gray-900">
          {params.slug.replace('-', ' ')}
        </h1>
        <p className="text-gray-500 mt-2">Productos ganadores analizados por Aether Engine.</p>
      </header>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed rounded-3xl border-gray-100">
          <p className="text-gray-400 italic">Pronto tendremos novedades en esta categoría.</p>
        </div>
      )}
    </main>
  );
}