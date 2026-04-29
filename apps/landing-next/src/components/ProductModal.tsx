'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle2, ShoppingCart, Truck, Star, AlertCircle, PlayCircle } from 'lucide-react';

interface ProductModalProps {
  productId: string;
  onClose: () => void;
}

export default function ProductModal({ productId, onClose }: ProductModalProps) {
  const [data, setData] = useState<any>(null);
  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) 
      ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&modestbranding=1&rel=0` 
      : url;
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

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"><div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (error || !data) return null;

  // Lógica de títulos y descripción (Soporta múltiples llaves de la IA)
  const title = data.marketing_copy?.headline || data.marketing_copy?.title || data.title_original;
  const description = data.marketing_copy?.description || data.marketing_copy?.copy || "Analizando beneficios...";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[3rem] relative shadow-2xl flex flex-col md:flex-row">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 z-[110] bg-slate-900/50 p-2 rounded-full"><X/></button>
        
        {/* MULTIMEDIA */}
        <div className="w-full md:w-1/2 p-8 flex flex-col gap-6 bg-slate-900/10">
          <div className="relative aspect-square rounded-[2.5rem] overflow-hidden border border-slate-800 bg-slate-900/50">
            {activeMedia?.type === 'video' ? (
              <div className="w-full h-full">
                {!isPlaying ? (
                  <div className="relative w-full h-full cursor-pointer" onClick={() => setIsPlaying(true)}>
                    <img src={data.image_url} className="w-full h-full object-cover brightness-50" />
                    <div className="absolute inset-0 flex items-center justify-center"><PlayCircle className="w-16 h-16 text-white" /></div>
                  </div>
                ) : (
                  activeMedia.url.includes('youtube') || activeMedia.url.includes('youtu.be') ? (
                    <iframe src={getVideoEmbedUrl(activeMedia.url)!} className="w-full h-full" allow="autoplay; fullscreen" />
                  ) : (
                    <video src={activeMedia.url} controls autoPlay className="w-full h-full object-cover" />
                  )
                )}
              </div>
            ) : ( <img src={activeMedia?.url} className="w-full h-full object-cover" /> )}
            
            <div className="absolute top-6 left-6 bg-emerald-500 text-black text-[10px] font-black px-4 py-2 rounded-full flex flex-col items-start leading-none uppercase">
              <span><Truck className="w-3 h-3 inline mr-1"/> Envío Gratis Chile</span>
              <span className="text-[8px] mt-1 opacity-80">Llega en 10-12 días</span>
            </div>
          </div>
          
          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {data.fullGallery?.map((item: any, i: number) => (
              <button key={i} onClick={() => {setActiveMedia(item); setIsPlaying(false);}} className={`w-16 h-16 rounded-xl border-2 overflow-hidden ${activeMedia?.url === item.url ? 'border-violet-500' : 'border-slate-800'}`}>
                {item.type === 'video' ? <PlayCircle className="w-6 h-6 m-auto mt-4 text-white"/> : <img src={item.url} className="w-full h-full object-cover"/>}
              </button>
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="w-full md:w-1/2 p-12 overflow-y-auto flex flex-col">
          <h2 className="text-4xl font-black text-white leading-tight mb-4 tracking-tighter">{title}</h2>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">{description}</p>
          
          {/* Precio CLP Formateado */}
          <div className="mt-auto pt-8 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Precio Final Oferta</p>
              <p className="text-5xl font-black text-white tracking-tighter">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(data.suggested_price_local || 0)}
              </p>
            </div>
            <button className="bg-violet-600 text-white px-8 py-5 rounded-2xl font-black uppercase text-xs flex items-center gap-3"><ShoppingCart/> Comprar Ahora</button>
          </div>
        </div>
      </div>
    </div>
  );
}