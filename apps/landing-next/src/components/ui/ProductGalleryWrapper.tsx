'use client';

import { useState, useMemo, useEffect } from 'react';
import { QuantitySelector } from './QuantitySelector';
import TechnicalFeatures from './TechnicalFeatures';
import { ProductTrustLogistics } from '../ProductTrustLogistics';
import VariantSelector from './VariantSelector';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { useCartStore } from '@/store/cartStore'; 
import { trackMetaEvent, generateEventId } from '@/lib/metaPixel'; 
import { CheckCircle2 } from 'lucide-react';

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

  // ⚡ Handler para el nuevo VariantSelector multidimensional
  const handleVariantChange = (newVariant: any) => {
    if (newVariant) {
      setSelectedVariantId(newVariant.ali_sku_id || newVariant.id);
    }
  };

  // ⚡ LÓGICA ULTRA LIMPIA: Solo leemos los campos calculados seguros del servidor
  const unitPrice = variant?.calculated_price_local ?? product.calculated_min_price ?? 0;

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

  const marketing = product.marketing_copy || {};

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Navbar countryCode={'CL'}  />
      </div>

      {/* ⚡ AUMENTO DE PADDING TOP (pt-36 md:pt-40) PARA DARLE AIRE A LA IMAGEN */}
      <main className="max-w-7xl mx-auto px-6 pt-36 md:pt-40 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20 items-start">
          
          {/* ========================================== */}
          {/* COLUMNA IZQUIERDA: GALERÍA DE IMÁGENES      */}
          {/* ========================================== */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-36 z-10 flex flex-col">
            <div className="aspect-square rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl">
              <img 
                src={activeImage} 
                className="w-full h-full object-cover transition-all duration-500" 
                alt="Product" 
              />
            </div>
            {/* ⚡ LA ANTIGUA GALERÍA DE MINIATURAS FUE ELIMINADA AQUÍ */}
          </div>

          {/* ========================================== */}
          {/* COLUMNA DERECHA: INFORMACIÓN REORDENADA     */}
          {/* ========================================== */}
          <div className="lg:col-span-7 flex flex-col space-y-8 md:space-y-10">
            
            {/* 1. TÍTULO Y CATEGORÍA */}
            <div className="space-y-4">
              <span className="bg-violet-600/10 text-violet-400 text-[9px] md:text-[10px] font-black px-3 py-1 rounded-full border border-violet-600/20 uppercase tracking-widest inline-block">
                {product.category_name || 'Componente Especializado'}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase italic leading-none">
                {marketing.title_localized || product.title_original}
              </h1>
            </div>

            {/* 2. SELECTOR DE VARIANTES */}
            {product.variants?.length > 0 && (
              <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-5 md:p-6">
                <VariantSelector 
                  variants={product.variants} 
                  selectedVariant={variant} 
                  onSelectVariant={handleVariantChange} 
                />
              </div>
            )}

            {/* 3. CAJA DE COMPRA (PRECIO Y CARRITO) */}
            <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 space-y-6 md:space-y-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {marketing.hook && (
                <div className="absolute top-0 left-0 right-0 bg-violet-600/20 border-b border-violet-500/30 px-4 md:px-6 py-2 text-center">
                  <span className="text-violet-300 text-[10px] md:text-sm font-bold tracking-wide">
                    ✨ {marketing.hook}
                  </span>
                </div>
              )}

              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 ${marketing.hook ? 'pt-6 md:pt-4' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1 md:mb-2 italic">Precio de Oferta</span>
                  <span className="text-5xl md:text-6xl lg:text-7xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                </div>
                <div className="w-full sm:w-40">
                  <QuantitySelector value={quantity} onChange={setQuantity} />
                </div>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={isAdded}
                className={`w-full py-5 md:py-8 rounded-2xl font-black text-lg md:text-2xl shadow-xl uppercase tracking-tighter transition-all active:scale-95 ${
                  isAdded 
                  ? 'bg-emerald-500 text-white cursor-default shadow-emerald-500/20' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/50 hover:shadow-violet-600/40'
                }`}
              >
                {isAdded ? '¡Añadido!' : 'Agregar al Carrito'}
              </button>
            </div>

            {/* 4. LOGÍSTICA Y CONFIANZA */}
            <ProductTrustLogistics product={product} />

            {/* 5. DESCRIPCIÓN Y BENEFICIOS (Movidos al fondo) */}
            <div className="space-y-6 pt-6 md:pt-8 border-t border-white/10">
              <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-wider">Acerca del Producto</h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed border-l-2 border-violet-600 pl-4 md:pl-6">
                {marketing.description_localized || product.title_original}
              </p>

              {marketing.benefits && marketing.benefits.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-4">
                  {marketing.benefits.map((benefit: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-xs md:text-sm font-medium leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 6. ESPECIFICACIONES TÉCNICAS */}
            <TechnicalFeatures attributes={product.raw_details?.properties || []} />

          </div>
        </div>
      </main>
      <Footer countryCode={'CL'} />
    </div>
  );
}