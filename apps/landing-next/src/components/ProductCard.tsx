// apps/landing-next/src/components/ProductCard.tsx
export const ProductCard = ({ product }: { product: any }) => {
  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all shadow-xl">
      <div className="aspect-square bg-slate-800 overflow-hidden">
        <img 
          src={product.image_url} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2">
            {product.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-bold text-white">
            ${product.suggested_price_local.toLocaleString('es-CL')}
          </span>
          <span className="text-sm text-slate-500 line-through">
            ${(product.suggested_price_local * 1.4).toLocaleString('es-CL')}
          </span>
        </div>
        <button className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-violet-400 transition-colors">
          Comprar Ahora
        </button>
      </div>
    </div>
  );
};