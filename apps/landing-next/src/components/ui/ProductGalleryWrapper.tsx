'use client';

import { useState, useMemo, useEffect } from 'react';
import { QuantitySelector } from './QuantitySelector';
import TechnicalFeatures from './TechnicalFeatures';
import { ProductTrustLogistics } from '../ProductTrustLogistics';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { useCartStore } from '@/store/cartStore'; 
import { trackMetaEvent, generateEventId } from '@/lib/metaPixel'; 

export default function ProductGalleryWrapper({ product }: any) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.ali_sku_id || product.variants?.[0]?.id || '');
  const [activeImage, setActiveImage] = useState(product.image_url);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false); 

  const addItem = useCartStore((state) => state.addItem);

  // ⚡ Buscamos la variante seleccionada utilizando su identificador
  const variant = useMemo(() => 
    product.variants?.find((v: any) => v.ali_sku_id === selectedVariantId || v.id === selectedVariantId) || null
  , [selectedVariantId, product.variants]);

  useEffect(() => {
    const variantImg = variant?.image_url || variant?.image;
    if (variantImg) {
      setActiveImage(variantImg);
    }
  }, [variant]);

  // ⚡ LÓGICA LIMPIA: El frontend SOLO lee lo que el servidor ya calculó
  const unitPrice = variant?.calculated_price_local 
    ?? product.calculated_min_price 
    ?? Number(product.suggested_price_local) 
    ?? 0;

  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(unitPrice * quantity);

  const handleAddToCart = () => {
    if (product.variants?.length > 0 && !selectedVariantId) {
      alert("Por favor selecciona una configuración disponible.");
      return;
    }

    try {
      const eventId = generateEventId();
      trackMetaEvent('AddToCart', {
        content_ids: [String(product.id)], 
        content_type: 'product',
        value: unitPrice * quantity, 
        currency: 'CLP'
      }, eventId);
    } catch (error) {
      console.warn("⚠️ Error registrando AddToCart en Meta Pixel:", error);
    }

    addItem({
      id: variant ? `${product.aliexpress_id}-${variant.ali_sku_id || variant.id}` : product.aliexpress_id,
      productId: product.aliexpress_id,
      variantId: variant?.ali_sku_id || variant?.id,
      title: product.marketing_copy?.title_localized || product.title_original,
      price: unitPrice, 
      quantity: quantity,
      imageUrl: activeImage || product.image_url,
      color: variant?.color,
      size: variant?.size
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Navbar countryCode={'CL'}  />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28 z-10">
            <div className="aspect-square rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl">
              <img 
                src={activeImage} 
                className="w-full h-full object-cover transition-all duration-500" 
                alt="Product" 
              />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              <button 
                onClick={() => setActiveImage(product.image_url)}
                className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === product.image_url ? 'border-violet-500 scale-105' : 'border-transparent opacity-50'}`}
              >
                <img src={product.image_url} className="w-full h-full object-cover" alt="Main" />
              </button>

              {product.variants?.filter((v: any) => v.image_url || v.image).map((v: any) => {
                const img = v.image_url || v.image;
                const vId = v.ali_sku_id || v.id;
                return (
                  <button 
                    key={vId}
                    onClick={() => {
                      setActiveImage(img);
                      setSelectedVariantId(vId);
                    }}
                    className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-violet-500 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="Variant" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col space-y-10">
            <header className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="bg-violet-600/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full border border-violet-600/20 uppercase tracking-widest">
                  {product.category_name || 'Componente Especializado'}
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-white uppercase italic leading-none">
                {product.marketing_copy?.title_localized || product.title_original}
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed border-l-2 border-violet-600 pl-6">
                {product.marketing_copy?.description_localized || product.title_original}
              </p>
            </header>

            <ProductTrustLogistics product={product} />

            {product.variants?.length > 0 && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuraciones Disponibles</span>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v: any) => {
                    const vId = v.ali_sku_id || v.id;
                    return (
                      <button
                        key={vId}
                        onClick={() => setSelectedVariantId(vId)}
                        className={`px-6 py-4 rounded-xl border-2 text-sm font-bold transition-all ${
                          selectedVariantId === vId 
                          ? 'border-violet-500 bg-violet-600 text-white shadow-lg' 
                          : 'border-white/10 text-slate-400 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        {v.color || 'Opción'} {v.size ? `• ${v.size}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 italic">Precio de Oferta</span>
                  <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                </div>
                <div className="w-full sm:w-40">
                  <QuantitySelector value={quantity} onChange={setQuantity} />
                </div>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={isAdded}
                className={`w-full py-8 rounded-2xl font-black text-2xl shadow-xl uppercase tracking-tighter transition-all active:scale-95 ${
                  isAdded 
                  ? 'bg-green-500 text-white cursor-default' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {isAdded ? '¡Añadido al Carrito!' : 'Agregar al Carrito'}
              </button>
            </div>

            <TechnicalFeatures attributes={product.raw_details?.properties || []} />
          </div>
        </div>
      </main>
      <Footer countryCode={'CL'} />
    </div>
  );
}