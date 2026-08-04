// src/components/ui/ProductCard.tsx
import Link from 'next/link';

interface ProductCardProps {
  product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
  const aliId = product.aliexpress_id || product.id;
  
  const price = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(product.suggested_price_local);

  return (
    <Link 
      href={`/products/${aliId}`} 
      className="group flex flex-col bg-slate-900 border border-slate-800 hover:border-violet-500 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-violet-900/20 h-full"
    >
      {/* Contenedor de Imagen (Look de Catálogo Limpio) */}
      <div className="aspect-square w-full bg-white relative p-4 flex items-center justify-center overflow-hidden">
        {/* mix-blend-multiply elimina el fondo blanco cuadrado de las fotos de Ali */}
        <img
          src={product.image_url}
          alt={product.title_original}
          className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2">
          <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-sm uppercase tracking-wider shadow-sm">
            Top Ventas
          </span>
        </div>
      </div>
      
      {/* Información del Producto */}
      <div className="p-3 md:p-4 flex flex-col flex-1 gap-2">
        <h3 className="text-slate-300 font-medium text-xs md:text-sm line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">
          {product.marketing_copy?.title_localized || product.title_original}
        </h3>
        
        {/* Rating Simulado (Estilo Amazon) */}
        <div className="flex items-center gap-1 mt-auto">
          <div className="flex text-yellow-400 text-[10px]">
            ★★★★★
          </div>
          <span className="text-slate-500 text-[10px]">(+100)</span>
        </div>

        {/* Precio y CTA */}
        <div className="mt-1 flex flex-col gap-2">
          <span className="text-lg md:text-xl font-black text-white leading-none">
            {price}
          </span>
          <button className="w-full bg-slate-800 text-white border border-slate-700 group-hover:bg-violet-600 group-hover:border-violet-600 rounded-md py-2 text-[11px] md:text-xs font-bold uppercase tracking-wider transition-colors mt-1">
            Ver Detalles
          </button>
        </div>
      </div>
    </Link>
  );
}