'use client';
import { useState, useMemo, useEffect } from 'react';
import { QuantitySelector } from './QuantitySelector';
import TechnicalFeatures from './TechnicalFeatures';
import { ProductTrustLogistics } from '../ProductTrustLogistics';
import Navbar from '../Navbar';
import Footer from '../Footer';


declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function ProductGalleryWrapper({ product }: any) {
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.ali_sku_id || '');
  const [activeImage, setActiveImage] = useState(product.image_url);
  const [quantity, setQuantity] = useState(1);
  // Estado para el feedback del botón de pago
  const [isProcessing, setIsProcessing] = useState(false);

  const variant = useMemo(() => 
    product.variants?.find((v: any) => v.ali_sku_id === selectedVariantId) || null
  , [selectedVariantId, product.variants]);

  useEffect(() => {
    const variantImg = variant?.image_url || variant?.image;
    if (variantImg) {
      setActiveImage(variantImg);
    }
  }, [variant]);

  const unitPrice = variant && Number(variant.additional_cost_usd) > 0
    ? (Number(variant.additional_cost_usd) * Number(product.rate_to_usd || 1))
    : Number(product.suggested_price_local);

  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(unitPrice * quantity);

  /**
   * INTEGRACIÓN MERCADO PAGO (MODAL)
   */
 const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // ⚡ FIX: Forzamos la URL absoluta para evitar el error de ruta relativa
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${baseUrl}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `order_${Date.now()}`,
          items: [{
            id: selectedVariantId || product.aliexpress_id,
            title: product.marketing_copy?.title_localized || product.title_original,
            price: unitPrice, // Se envía como 'price', el service lo mapea a 'unit_price'
            quantity: quantity
          }]
        })
      });

      if (!response.ok) throw new Error('Error en la respuesta del servidor');

      const { preferenceId } = await response.json();

      const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, {
        locale: 'es-CL'
      });

      mp.checkout({
        preference: { id: preferenceId },
        autoOpen: true,
      });

    } catch (error) {
      console.error("❌ Error:", error);
      alert("Error al conectar con el servidor de pagos.");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="min-h-screen bg-black text-white">
      {/* 1. Navbar con z-index alto para que el sticky pase por debajo */}
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Navbar countryCode={'CL'}  />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* 📸 IZQUIERDA: Galería */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28 z-10">
            {/* Foto Principal */}
            <div className="aspect-square rounded-[3rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl">
              <img 
                src={activeImage} 
                className="w-full h-full object-cover transition-all duration-500" 
                alt="Product" 
              />
            </div>

            {/* Miniaturas */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              <button 
                onClick={() => setActiveImage(product.image_url)}
                className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === product.image_url ? 'border-violet-500 scale-105' : 'border-transparent opacity-50'}`}
              >
                <img src={product.image_url} className="w-full h-full object-cover" alt="Main" />
              </button>

              {product.variants?.filter((v: any) => v.image_url || v.image).map((v: any) => {
                const img = v.image_url || v.image;
                return (
                  <button 
                    key={v.ali_sku_id}
                    onClick={() => {
                      setActiveImage(img);
                      setSelectedVariantId(v.ali_sku_id);
                    }}
                    className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-violet-500 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="Variant" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🛒 DERECHA: Commerce */}
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

            {/* ⚡ LOGÍSTICA */}
            <ProductTrustLogistics product={product} />

            {/* Selector de Variantes */}
            {product.variants?.length > 0 && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuraciones Disponibles</span>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v: any) => (
                    <button
                      key={v.ali_sku_id}
                      onClick={() => setSelectedVariantId(v.ali_sku_id)}
                      className={`px-6 py-4 rounded-xl border-2 text-sm font-bold transition-all ${
                        selectedVariantId === v.ali_sku_id 
                        ? 'border-violet-500 bg-violet-600 text-white shadow-lg' 
                        : 'border-white/10 text-slate-400 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      {v.color || 'Opción'} {v.size ? `• ${v.size}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Caja de Compra */}
            <div className="bg-slate-900/60 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 italic">Inversión Final</span>
                  <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{formattedTotal}</span>
                </div>
                <div className="w-full sm:w-40">
                  <QuantitySelector value={quantity} onChange={setQuantity} />
                </div>
              </div>
              
              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-8 rounded-2xl font-black text-2xl shadow-xl uppercase tracking-tighter transition-all active:scale-95 ${
                  isProcessing 
                  ? 'bg-slate-800 text-slate-500 cursor-wait' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {isProcessing ? 'Procesando...' : 'Adquirir Ahora'}
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