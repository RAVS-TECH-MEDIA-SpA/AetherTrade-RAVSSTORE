'use client';
import { useState, useEffect } from 'react';
import { X, ShoppingCart, Truck, PlayCircle, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

interface ProductModalProps {
  productId: string;
  onClose: () => void;
}

export default function ProductModal({ productId, onClose }: ProductModalProps) {
  const [data, setData] = useState<any>(null);
  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState(false);

  const getVideoEmbedUrl = (url: string) => {
  if (!url) return null;

  // 1. YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1&modestbranding=1`;
  }

  // 2. Instagram (Reels o Posts)
  if (url.includes('instagram.com')) {
    // Limpiamos la URL y forzamos el sufijo /embed
    const cleanUrl = url.split('?')[0]; 
    return `${cleanUrl}${cleanUrl.endsWith('/') ? '' : '/'}embed`;
  }

  // 3. TikTok
  if (url.includes('tiktok.com')) {
    // Intentamos extraer el ID del video del final de la URL
    const tiktokIdMatch = url.match(/\/video\/(\d+)/);
    if (tiktokIdMatch) {
      return `https://www.tiktok.com/embed/v2/${tiktokIdMatch[1]}`;
    }
    // Si es un enlace corto o perfil, TikTok es difícil de embeber sin su script oficial
    return null; 
  }

  return url; // Retorna tal cual si ya es un MP4 o similar
};

  useEffect(() => {
    setLoading(true);
    setIsPlaying(false);
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(json => {
        const gallery: any[] = [];
        if (json.video_url) gallery.push({ type: 'video', url: json.video_url });
        const imgs = json.local_images?.length > 0 ? json.local_images : [json.image_url];
        imgs.forEach((img: string) => img && gallery.push({ type: 'image', url: img }));
        
        setData({ ...json, fullGallery: gallery });
        setActiveMedia(gallery[0] || null);
        setLoading(false);
      }).catch(() => setError(true));
  }, [productId]);

  const handleCheckout = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch(`/api/checkout/products/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: 1 })
      });
      const result = await res.json();
      if (result.init_point) {
        window.location.href = result.init_point;
      } else {
        throw new Error(result.error || 'Error al generar checkout');
      }
    } catch (err) {
      console.error("🚨 Error al iniciar el proceso de compra:", err);
      alert("Hubo un problema al conectar con la pasarela de pagos.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"><div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (error || !data) return null;

  // Extracción de datos con fallback
  const title = data.marketing_copy?.title_localized || data.marketing_copy?.headline || data.title_original;
  const description = data.marketing_copy?.description || data.marketing_copy?.copy;
  const hook = data.marketing_copy?.hook;
  const benefits = data.marketing_copy?.benefits || []; // El array que vimos en tu JSON

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[3rem] relative shadow-2xl flex flex-col md:flex-row">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 z-[110] bg-slate-900/50 p-2 rounded-full hover:text-white transition-colors">
          <X/>
        </button>
        
        {/* IZQUIERDA: MULTIMEDIA */}
        <div className="w-full md:w-1/2 p-8 flex flex-col gap-6 bg-slate-900/10">
          <div className="relative aspect-square rounded-[2.5rem] overflow-hidden border border-slate-800 bg-slate-900/50">
            {activeMedia?.type === 'video' ? (
              <div className="w-full h-full">
                {!isPlaying ? (
                  <div className="relative w-full h-full cursor-pointer" onClick={() => setIsPlaying(true)}>
                    <img src={data.image_url} className="w-full h-full object-cover brightness-50" alt="Preview" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="w-16 h-16 text-white" />
                    </div>
                  </div>
                ) : (
                  activeMedia.url.includes('youtube') || activeMedia.url.includes('youtu.be') ? (
                    <iframe 
                        src={getVideoEmbedUrl(activeMedia.url)!} 
                        className={`w-full h-full ${activeMedia.url.includes('instagram') || activeMedia.url.includes('tiktok') ? 'aspect-[9/16]' : ''}`}
                        allow="autoplay; fullscreen" 
                        frameBorder="0"
                      />
                  ) : (
                    <video src={activeMedia.url} controls autoPlay className="w-full h-full object-cover" />
                  )
                )}
              </div>
            ) : ( 
              <img src={activeMedia?.url} className="w-full h-full object-cover" alt="Product" /> 
            )}
            
            <div className="absolute top-6 left-6 bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full flex flex-col items-start leading-none uppercase">
              <span><Truck className="w-3 h-3 inline mr-1"/> Envío Gratis Chile</span>
              <span className="text-[8px] mt-1 opacity-80">Llega en 10-12 días</span>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {data.fullGallery?.map((item: any, i: number) => (
              <button 
                key={i} 
                onClick={() => {setActiveMedia(item); setIsPlaying(false);}} 
                className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${activeMedia?.url === item.url ? 'border-violet-500 scale-95' : 'border-slate-800'}`}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center"><PlayCircle className="w-6 h-6 text-white"/></div>
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* DERECHA: INFO Y BENEFICIOS */}
        <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto flex flex-col custom-scrollbar">
          <div className="mb-8">
            {hook && (
              <span className="inline-flex items-center gap-2 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 bg-violet-500/10 px-3 py-1 rounded-full">
                <Sparkles className="w-3 h-3" /> {hook}
              </span>
            )}
            <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.1] tracking-tighter mb-4">
              {title}
            </h2>
            <div className="h-1 w-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full"></div>
          </div>

          <p className="text-slate-400 text-base md:text-lg mb-10 leading-relaxed font-medium">
            {description}
          </p>

          {/* NUEVA SECCIÓN DE BENEFICIOS */}
          {benefits.length > 0 && (
            <div className="grid gap-4 mb-10">
              <h4 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                ¿Por qué lo necesitas?
              </h4>
              {benefits.map((benefit: string, idx: number) => (
                <div key={idx} className="flex gap-4 p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl group hover:border-violet-500/30 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-300 text-sm leading-relaxed font-medium">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* FOOTER: PRECIO Y COMPRA */}
          <div className="mt-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Precio Oferta Limitada</p>
              <p className="text-5xl font-black text-white tracking-tighter">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(data.suggested_price_local || 0)}
              </p>
            </div>
            
            <button 
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full sm:w-auto bg-violet-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-70 shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)]"
            >
              {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
              Comprar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}