// src/components/ui/ProductGalleryWrapper.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { QuantitySelector } from './QuantitySelector';
import TechnicalFeatures from './TechnicalFeatures';
import { ProductTrustLogistics } from '../ProductTrustLogistics';
import VariantSelector from './VariantSelector';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { useCartStore } from '@/store/cartStore'; 
import { trackMetaEvent, generateEventId } from '@/lib/metaPixel'; 
// ⚡ NUEVO: Agregamos BookOpen y Check para los íconos de la guía
import { CheckCircle2, Info, Camera, Package, ChevronLeft, ChevronRight, BookOpen, Check } from 'lucide-react';

// ⚡ NUEVO: Recibimos guiaDigital como Prop
export default function ProductGalleryWrapper({ product, guiaDigital }: any) {
  const cloudImages = Array.isArray(product.local_images) 
    ? product.local_images.filter((img: string) => img && img.trim() !== '') 
    : [];
  
  const defaultImage = cloudImages.length > 0 ? cloudImages[0] : product.image_url;

  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.ali_sku_id || product.variants?.[0]?.id || '');
  const [activeImage, setActiveImage] = useState(defaultImage);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false); 

  // ⚡ NUEVO: Estado para saber si el usuario marcó la casilla de la guía
  const [includeGuide, setIncludeGuide] = useState(false);

  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

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

  const isVariantImage = useMemo(() => {
    if (!variant) return false;
    const vImg = variant.image_url || variant.image;
    return activeImage === vImg;
  }, [activeImage, variant]);

  const handleThumbnailScroll = () => {
    if (thumbnailsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = thumbnailsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    handleThumbnailScroll(); 
    window.addEventListener('resize', handleThumbnailScroll);
    return () => window.removeEventListener('resize', handleThumbnailScroll);
  }, [cloudImages]);

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (thumbnailsRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      thumbnailsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleVariantChange = (newVariant: any) => {
    if (newVariant) {
      setSelectedVariantId(newVariant.ali_sku_id || newVariant.id);
    }
  };

  const unitPrice = variant?.calculated_price_local ?? product.calculated_min_price ?? 0;

  // ⚡ NUEVO: Lógica de precios sumando la guía si está seleccionada
  const guidePrice = guiaDigital?.precio_clp || 2990;
  const totalPrice = (unitPrice * quantity) + (includeGuide ? guidePrice : 0);

  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(totalPrice);

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
        value: totalPrice, // Enviamos el precio total (con o sin guía) al Pixel
        currency: 'CLP'
      }, eventId);
    } catch (error) {
      console.warn("⚠️ Error registrando AddToCart en Meta Pixel:", error);
    }

    // 1. Agregamos el producto físico al carrito
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

    // 2. ⚡ NUEVO: Agregamos la guía digital si el usuario la marcó
    if (includeGuide && guiaDigital) {
      addItem({
          id: `guia-${guiaDigital.id}`,
          productId: guiaDigital.id, 
          variantId: 'digital',
          title: `📚 Guía Digital: ${guiaDigital.titulo}`,
          price: guidePrice,
          quantity: 1, 
          imageUrl: activeImage, 
          isDigital: true 
      });
    }

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const marketing = product.marketing_copy || {};

  return (
    <div className="min-h-screen bg-black text-white relative pb-28 lg:pb-0">
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Navbar countryCode={'CL'}  />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-20 items-start">
          
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA: GALERÍA (Y CABECERA MOBILE)            */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-4 lg:space-y-6 lg:sticky lg:top-28 z-10 flex flex-col">
            
            <div className="flex flex-col lg:hidden space-y-2 mb-2 pt-2">
              <span className="bg-violet-600/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full border border-violet-600/20 uppercase tracking-widest w-max">
                {product.category_name || 'Componente Especializado'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase italic leading-tight">
                {marketing.title_localized || product.title_original}
              </h1>
              <div className="flex items-end gap-3 mt-1">
                <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                {product.calculated_old_price > 0 && !includeGuide && (
                  <span className="text-sm text-slate-500 line-through mb-1 decoration-rose-500/50">
                    {formattedOldPrice}
                  </span>
                )}
              </div>
            </div>

            <div className="aspect-square rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl relative group">
              <img 
                src={activeImage} 
                className="w-full h-full object-cover transition-all duration-500" 
                alt="Product" 
              />
              
              {product.calculated_discount_percent > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                  -{product.calculated_discount_percent}% OFF
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center z-10">
                <div className="group/tooltip relative flex items-center gap-1.5 md:gap-2 bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-xl cursor-help hover:bg-slate-900/90 transition-colors">
                  {isVariantImage ? (
                    <>
                      <Package className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                      <span className="text-[10px] md:text-xs font-semibold text-slate-200 uppercase tracking-wide">Tu selección exacta</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400" />
                      <span className="text-[10px] md:text-xs font-semibold text-slate-200 uppercase tracking-wide">Imagen de demostración</span>
                    </>
                  )}
                  
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 md:w-64 p-3 bg-slate-800 text-xs text-slate-300 rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl border border-slate-700 text-center transform translate-y-2 group-hover/tooltip:translate-y-0">
                    {isVariantImage
                      ? 'Esta es la imagen real del producto exacto (color/modelo) que vas a recibir basándose en tu selección actual.'
                      : 'Imagen referencial de marketing para mostrar el uso o detalles del producto. El modelo a recibir depende de tu selección de variante.'}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {cloudImages.length > 1 && (
              <div className="flex flex-col space-y-2 pt-2 relative group/carousel">
                <div className="flex items-center gap-1.5 px-1">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Galería de Contexto</span>
                </div>
                
                <div className="relative w-full">
                  {showLeftArrow && (
                    <button
                      onClick={() => scrollThumbnails('left')}
                      className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-12 items-center justify-center bg-slate-900/90 hover:bg-violet-600 border border-white/10 rounded-r-lg shadow-xl text-white transition-all backdrop-blur-md opacity-0 group-hover/carousel:opacity-100"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  <div 
                    ref={thumbnailsRef}
                    onScroll={handleThumbnailScroll}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden pb-2 px-1"
                  >
                    {cloudImages.map((img: string, idx: number) => (
                       <button 
                         key={idx}
                         onClick={() => setActiveImage(img)}
                         className={`snap-center shrink-0 w-20 h-20 md:w-24 md:h-24 aspect-square rounded-2xl overflow-hidden border-[3px] transition-all duration-200 ${
                          activeImage === img 
                            ? 'border-violet-500 shadow-lg shadow-violet-500/20 scale-95' 
                            : 'border-transparent hover:border-slate-700'
                         }`}
                       >
                         <img src={img} className="w-full h-full object-cover mix-blend-multiply bg-white" alt={`Demostración ${idx + 1}`} />
                       </button>
                    ))}
                  </div>

                  {showRightArrow && (
                    <button
                      onClick={() => scrollThumbnails('right')}
                      className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-12 items-center justify-center bg-slate-900/90 hover:bg-violet-600 border border-white/10 rounded-l-lg shadow-xl text-white transition-all backdrop-blur-md opacity-0 group-hover/carousel:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* COLUMNA DERECHA: INFORMACIÓN Y CTA                        */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col space-y-6 md:space-y-10 mt-2 lg:mt-0">
            
            <div className="hidden lg:flex flex-col space-y-4">
              <span className="bg-violet-600/10 text-violet-400 text-[10px] font-black px-3 py-1 rounded-full border border-violet-600/20 uppercase tracking-widest inline-block w-max">
                {product.category_name || 'Componente Especializado'}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase italic leading-none">
                {marketing.title_localized || product.title_original}
              </h1>
            </div>

            {product.variants?.length > 0 && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paso 1: Elige tu opción</span>
                  {!isVariantImage && (
                    <span className="text-[10px] text-sky-400 animate-pulse hidden md:inline-block">
                      Asegúrate de seleccionar el color/modelo correcto
                    </span>
                  )}
                </div>
                <VariantSelector 
                  variants={product.variants} 
                  selectedVariant={variant} 
                  onSelectVariant={handleVariantChange} 
                />
              </div>
            )}

            {/* ⚡ NUEVO: Sección Upsell Guía Digital (Mobile - visible debajo de variantes) */}
            {guiaDigital && (
              <div 
                onClick={() => setIncludeGuide(!includeGuide)}
                className={`lg:hidden relative overflow-hidden cursor-pointer rounded-2xl border-2 transition-all duration-300 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 ${
                  includeGuide 
                  ? 'bg-violet-900/30 border-violet-500 shadow-lg shadow-violet-500/10' 
                  : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  includeGuide ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {includeGuide ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wide">
                      Añadir Guía Premium
                    </h4>
                    <span className="text-violet-400 text-xs sm:text-sm font-black">+${guidePrice.toLocaleString('es-CL')}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-tight line-clamp-2">
                    {guiaDigital.titulo}. Maximiza resultados al instante.
                  </p>
                </div>
              </div>
            )}

            {marketing.hook && (
              <div className="lg:hidden bg-violet-600/10 border border-violet-500/20 rounded-xl px-4 py-3 text-center mb-2">
                <span className="text-violet-300 text-[11px] font-bold tracking-wide">
                  ✨ {marketing.hook}
                </span>
              </div>
            )}

            <div className="hidden lg:block bg-slate-900/60 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {marketing.hook && (
                <div className="absolute top-0 left-0 right-0 bg-violet-600/20 border-b border-violet-500/30 px-6 py-2 text-center">
                  <span className="text-violet-300 text-sm font-bold tracking-wide">
                    ✨ {marketing.hook}
                  </span>
                </div>
              )}

              {/* ⚡ NUEVO: Sección Upsell Guía Digital (Desktop) */}
              {guiaDigital && (
                <div 
                  onClick={() => setIncludeGuide(!includeGuide)}
                  className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 transition-all duration-300 p-4 flex items-center gap-4 ${
                    includeGuide 
                    ? 'bg-violet-900/30 border-violet-500 shadow-lg shadow-violet-500/10' 
                    : 'bg-slate-900/80 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    includeGuide ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {includeGuide ? <Check className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                        Guía Digital Exclusiva
                      </h4>
                      <span className="text-violet-400 font-black">+${guidePrice.toLocaleString('es-CL')}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 pr-4 line-clamp-2">
                      {guiaDigital.titulo}. Maximiza tus resultados y conviértete en un experto al instante.
                    </p>
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-between gap-6 ${marketing.hook ? 'pt-4' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 italic">Precio Final</span>
                  <div className="flex items-end gap-3">
                    <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                    {product.calculated_old_price > 0 && !includeGuide && (
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
                className={`w-full py-8 rounded-2xl font-black text-2xl shadow-xl uppercase tracking-tighter transition-all active:scale-95 flex justify-center items-center gap-3 ${
                  isAdded 
                  ? 'bg-emerald-500 text-white cursor-default shadow-emerald-500/20' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/50 hover:shadow-violet-600/40'
                }`}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 className="w-8 h-8" />
                    ¡Añadido al Carrito!
                  </>
                ) : 'Agregar al Carrito'}
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

            <TechnicalFeatures attributes={marketing.technical_html_localized || product.raw_details?.description || []} />

          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 📱 STICKY BOTTOM BAR (SOLO MOBILE)                        */}
      {/* ========================================================= */}
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