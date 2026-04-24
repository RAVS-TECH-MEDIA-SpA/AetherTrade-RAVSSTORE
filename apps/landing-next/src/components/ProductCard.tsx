'use client';
interface Product {
  id: number;
  title: string;
  image_url: string;
  price_usd: number;
  suggested_price_local: number;
  roi_percentage: number;
  aliexpress_id: string;
}

export const ProductCard = ({ product }: { product: Product }) => {
  // Formateador de moneda chilena
  const clp = (val: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500 transition-all">
      <div className="aspect-square bg-slate-800 overflow-hidden">
        <img 
          src={product.image_url} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">
          {product.roi_percentage}% ROI
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2 h-12">
          {product.title}
        </h3>
        <div className="mt-4 flex justify-between items-end">
          <div>
            <p className="text-slate-400 text-xs">Precio Sugerido</p>
            <p className="text-xl font-bold text-violet-400">{clp(product.suggested_price_local)}</p>
          </div>
          <a 
            href={`https://www.aliexpress.com/item/${product.aliexpress_id}.html`}
            target="_blank"
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-violet-500 hover:text-white transition-colors"
          >
            Ver
          </a>
        </div>
      </div>
    </div>
  );
};