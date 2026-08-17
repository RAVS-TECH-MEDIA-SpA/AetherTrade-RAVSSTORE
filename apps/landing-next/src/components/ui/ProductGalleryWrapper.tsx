// src/components/ui/ProductGalleryWrapper.tsx
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
  // ⚡ Lógica de rescate de imágenes de Google Cloud
  const cloudImages = Array.isArray(product.local_images) 
    ? product.local_images.filter((img: string) => img && img.trim() !== '') 
    : [];
  
  const defaultImage = cloudImages.length > 0 ? cloudImages[0] : product.image_url;

  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.ali_sku_id || product.variants?.[0]?.id || '');
  const [activeImage, setActiveImage] = useState(defaultImage);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false); 

  const addItem = useCartStore((state) => state.addItem);

  const variant = useMemo(() => 
    product.variants?.find((v: any) => v.ali_sku_id === selectedVariantId || v.id === selectedVariantId) || null
  , [selectedVariantId, product.variants]);

  useEffect(() => {
    const variantImg = variant?.image_url || variant?.image;
    if (variantImg) {
      setActiveImage(variantImg);
    } else if (cloudImages.length > 0) {
      setActiveImage(cloudImages[0]);
    }
  }, [variant]);

  const handleVariantChange = (newVariant: any) => {
    if (newVariant) {
      setSelectedVariantId(newVariant.ali_sku_id || newVariant.id);
    }
  };

  const unitPrice = variant?.calculated_price_local ?? product.calculated_min_price ?? 0;

  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(unitPrice * quantity);

  const formattedOldPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(product.calculated_old_price || 0);

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
      productId: product.id,
      variantId: variant?.ali_sku_id || variant?.id,
      title: product.marketing_copy?.title_localized || product.title_original,
      price: unitPrice, 
      quantity: quantity,
      imageUrl: activeImage,
      color: variant?.color,
      size: variant?.size
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const marketing = product.marketing_copy || {};

  return (
    // ⚡ FIX: pb-28 lg:pb-0 para que el footer no quede tapado por la barra flotante
    <div className="min-h-screen bg-black text-white relative pb-28 lg:pb-0">
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Navbar countryCode={'CL'}  />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 md:pt-40 pb-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-20 items-start">
          
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA: GALERÍA (Y CABECERA MOBILE)            */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-4 lg:space-y-6 lg:sticky lg:top-36 z-10 flex flex-col">
            
            {/* 📱 MOBILE ONLY: Cabecera Invertida (Categoría, Título, Precio) */}
            <div className="flex flex-col lg:hidden space-y-2 mb-2 pt-2">
              <span className="bg-violet-600/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full border border-violet-600/20 uppercase tracking-widest w-max">
                {product.category_name || 'Componente Especializado'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase italic leading-tight">
                {marketing.title_localized || product.title_original}
              </h1>
              <div className="flex items-end gap-3 mt-1">
                <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                {product.calculated_old_price > 0 && (
                  <span className="text-sm text-slate-500 line-through mb-1 decoration-rose-500/50">
                    {formattedOldPrice}
                  </span>
                )}
              </div>
            </div>

            {/* Imagen Principal */}
            <div className="aspect-square rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl relative">
              <img 
                src={activeImage} 
                className="w-full h-full object-cover transition-all duration-500" 
                alt="Product" 
              />
              {/* Etiqueta de descuento opcional */}
              {product.calculated_discount_percent > 0 && (
                <div className="absolute top-4 left-4 bg-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                  -{product.calculated_discount_percent}% OFF
                </div>
              )}
            </div>
            
            {/* Miniaturas: Carrusel Horizontal en Mobile, Grid en Desktop */}
            {cloudImages.length > 1 && (
              <div className="flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden pb-2 pt-1">
                {cloudImages.map((img: string, idx: number) => (
                   <button 
                     key={idx}
                     onClick={() => setActiveImage(img)}
                     className={`snap-center shrink-0 w-20 h-20 lg:w-auto lg:h-auto aspect-square rounded-xl overflow-hidden border-2 transition-colors ${activeImage === img ? 'border-violet-500' : 'border-transparent'}`}
                   >
                     <img src={img} className="w-full h-full object-cover mix-blend-multiply bg-white" />
                   </button>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* COLUMNA DERECHA: INFORMACIÓN Y CTA                        */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col space-y-6 md:space-y-10 mt-2 lg:mt-0">
            
            {/* 💻 DESKTOP ONLY: Cabecera Original */}
            <div className="hidden lg:flex flex-col space-y-4">
              <span className="bg-violet-600/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full border border-violet-600/20 uppercase tracking-widest inline-block w-max">
                {product.category_name || 'Componente Especializado'}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase italic leading-none">
                {marketing.title_localized || product.title_original}
              </h1>
            </div>

            {/* Selector de Variantes */}
            {product.variants?.length > 0 && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6">
                <VariantSelector 
                  variants={product.variants} 
                  selectedVariant={variant} 
                  onSelectVariant={handleVariantChange} 
                />
              </div>
            )}

            {/* 📱 MOBILE ONLY: Hook de Marketing */}
            {marketing.hook && (
              <div className="lg:hidden bg-violet-600/10 border border-violet-500/20 rounded-xl px-4 py-3 text-center mb-2">
                <span className="text-violet-300 text-[11px] font-bold tracking-wide">
                  ✨ {marketing.hook}
                </span>
              </div>
            )}

            {/* 💻 DESKTOP ONLY: Caja de Precio y CTA Gigante */}
            <div className="hidden lg:block bg-slate-900/60 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {marketing.hook && (
                <div className="absolute top-0 left-0 right-0 bg-violet-600/20 border-b border-violet-500/30 px-6 py-2 text-center">
                  <span className="text-violet-300 text-sm font-bold tracking-wide">
                    ✨ {marketing.hook}
                  </span>
                </div>
              )}

              <div className={`flex items-center justify-between gap-6 ${marketing.hook ? 'pt-4' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 italic">Precio de Oferta</span>
                  <div className="flex items-end gap-3">
                    <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                    {product.calculated_old_price > 0 && (
                      <span className="text-xl text-slate-500 line-through mb-2 decoration-rose-500/50">{formattedOldPrice}</span>
                    )}
                  </div>
                </div>
                <div className="w-40">
                  <QuantitySelector value={quantity} onChange={setQuantity} />
                </div>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={isAdded}
                className={`w-full py-8 rounded-2xl font-black text-2xl shadow-xl uppercase tracking-tighter transition-all active:scale-95 ${
                  isAdded 
                  ? 'bg-emerald-500 text-white cursor-default shadow-emerald-500/20' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/50 hover:shadow-violet-600/40'
                }`}
              >
                {isAdded ? '¡Añadido!' : 'Agregar al Carrito'}
              </button>
            </div>

            <ProductTrustLogistics product={product} />

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

            <TechnicalFeatures attributes={product.raw_details?.properties || []} />

          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 📱 STICKY BOTTOM BAR (SOLO MOBILE)                          */}
      {/* ========================================================= */}
      {/* ⚡ FIX: z-40 para que no tape al carrito al abrirse */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#020617]/95 backdrop-blur-xl border-t border-white/10 z-40 flex items-center gap-3 lg:hidden pb-6">
        <div className="w-[110px] shrink-0">
          <QuantitySelector value={quantity} onChange={setQuantity} />
        </div>
        <button 
          onClick={handleAddToCart}
          disabled={isAdded}
          className={`flex-1 py-3.5 rounded-xl font-black text-[13px] uppercase tracking-wider transition-all active:scale-95 flex justify-center items-center gap-2 ${
            isAdded 
            ? 'bg-emerald-500 text-white cursor-default shadow-emerald-500/20' 
            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50'
          }`}
        >
          {isAdded ? '¡Añadido!' : `Agregar • ${formattedTotal}`}
        </button>
      </div>

      <Footer countryCode={'CL'} />
    </div>
  );
}