'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { ShieldCheck, Truck, CreditCard, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import InitiateCheckoutTracker from './components/InitiateCheckoutTracker'; // <-- Ajusta path si lo tienes en @/components
import { getMetaCookies } from '@/lib/metaPixel';

// ⚡ UTILIDADES DE NORMALIZACIÓN
const formatRut = (rut: string) => {
  // Quita todo lo que no sea número o la letra K
  const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleanRut.length < 2) return cleanRut;
  
  // Separa el dígito verificador del resto del cuerpo
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  
  // Agrega los puntos al cuerpo del RUT
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
};

const cleanText = (text: string) => {
  // Quita espacios al inicio y al final, y previene inyección de código básico
  return text.trim().replace(/[<>]/g, '');
};

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function CheckoutPage() {
  const { items, getTotalPrice } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado del formulario de envío
  const [shippingData, setShippingData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    rut: '',
    phone: '',
    address: '',
    city: '',
    region: 'Región Metropolitana'
  });

  // Cargar el Script de Mercado Pago dinámicamente
  useEffect(() => {
    setIsMounted(true);
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const total = getTotalPrice();
  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(total);

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // Si el campo es el RUT, lo formateamos en tiempo real
    if (name === 'rut') {
      value = formatRut(value);
    }
    
    setShippingData({ ...shippingData, [name]: value });
  };

const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Usamos el endpoint de checkout general de Next.js
      const baseUrl = '/api/checkout';

      // <-- INTEGRACIÓN CAPI: Captura fbc/fbp del navegador
      const { fbc, fbp } = getMetaCookies();

      // <-- INTEGRACIÓN PurchaseTracker: Guarda backup para el success
      localStorage.setItem('last_order_backup', JSON.stringify({ items, total: getTotalPrice() }));

      const payload = {
        customerInfo: {
          email: shippingData.email.trim().toLowerCase(),
          name: `${cleanText(shippingData.firstName)} ${cleanText(shippingData.lastName)}`,
          rut: shippingData.rut,
          phone: shippingData.phone.replace(/[^\d+]/g, '')
        },
        shippingAddress: {
          street: cleanText(shippingData.address),
          number: "S/N", // AutoDS no exige número separado estrictamente si va en la calle
          city: cleanText(shippingData.city),
          state: shippingData.region,
          zip: "0000000" // Valor por defecto. Si luego lo agregas al form, lo cambias aquí.
        },
        // ⚡ LA CLAVE: Enviamos el carrito completo con variantes
        items: items.map(item => ({
          product_id: item.productId, // El ID de tu BD (UUID)
          variant_id: item.variantId, // El ID de la variante elegida
          quantity: item.quantity,
          title: cleanText(item.title),
          price: item.price
        })),
        // <-- INTEGRACIÓN CAPI: Enviamos cookies y contexto al gateway
        fbc,
        fbp,
        clientUserAgent: navigator.userAgent,
        eventSourceUrl: window.location.href
      };

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido en el servidor');
      }

      const { init_point } = await response.json();

      // Redirigir directamente al link de pago de MercadoPago
      window.location.href = init_point;

    } catch (error: any) {
      console.error("❌ Error en Checkout:", error.message || error);
      alert(`Hubo un problema al procesar el pago: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Evitar error de hidratación o renderizar si el carrito está vacío
  if (!isMounted) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white space-y-6">
        <ShoppingCartIcon className="w-20 h-20 text-slate-600" />
        <h1 className="text-2xl font-black uppercase tracking-widest italic">Tu carrito está vacío</h1>
        <Link href="/" className="px-8 py-3 bg-violet-600 rounded-full font-bold uppercase tracking-widest hover:bg-violet-500 transition-colors">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
        <InitiateCheckoutTracker products={items.map(i => ({ id: i.productId }))} total={total} />

      {/* Header Minimalista */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
          </Link>
          <span className="text-xl font-black tracking-tighter text-white uppercase italic">
            RAVS<span className="text-violet-500">STORE</span>
          </span>
          <ShieldCheck className="w-6 h-6 text-green-400" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* 📝 COLUMNA IZQUIERDA: Formulario de Envío */}
          <div className="flex-1 space-y-10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest italic mb-6">Datos de Envío</h2>
              <form id="checkout-form" onSubmit={handlePayment} className="space-y-6">
                
                {/* Contacto */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contacto</h3>
                  <div>
                    <input required type="email" name="email" value={shippingData.email} onChange={handleInputChange} placeholder="Correo electrónico" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" />
                  </div>
                </div>

                {/* Dirección */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8">Dirección de Entrega</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" name="firstName" value={shippingData.firstName} onChange={handleInputChange} placeholder="Nombre" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                    <input required type="text" name="lastName" value={shippingData.lastName} onChange={handleInputChange} placeholder="Apellidos" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                  </div>
                  <input required type="text" name="rut" value={shippingData.rut} onChange={handleInputChange} placeholder="RUT / Documento de Identidad" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                  <input required type="text" name="address" value={shippingData.address} onChange={handleInputChange} placeholder="Calle y Número (Ej: Av. Providencia 1234, Depto 50)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" name="city" value={shippingData.city} onChange={handleInputChange} placeholder="Ciudad / Comuna" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                    <select name="region" value={shippingData.region} onChange={handleInputChange} className="w-full bg-[#0a0f24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-all appearance-none">
                      <option value="Región Metropolitana">Región Metropolitana</option>
                      <option value="Valparaíso">Valparaíso</option>
                      <option value="Biobío">Biobío</option>
                      <option value="Otras Regiones">Otras Regiones</option>
                    </select>
                  </div>
                  <input required type="tel" name="phone" value={shippingData.phone} onChange={handleInputChange} placeholder="Teléfono" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                </div>
              </form>
            </div>
          </div>

          {/* 🛒 COLUMNA DERECHA: Resumen de la Orden */}
          <div className="lg:w-[450px]">
            <div className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-8 space-y-8 sticky top-28 shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-black uppercase tracking-widest italic border-b border-white/10 pb-4">Resumen</h2>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto scrollbar-hide">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      <span className="absolute -top-2 -right-2 bg-slate-800 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-slate-600">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.color} {item.size}</p>
                    </div>
                    <span className="font-black">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-white/10 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white">{formattedTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío (Despacho Gratis)</span>
                  <span className="text-green-400 font-bold">$0</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-6 border-t border-white/10">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total a Pagar</span>
                <span className="text-4xl font-black tracking-tighter text-white">{formattedTotal}</span>
              </div>

              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className={`w-full py-5 rounded-xl font-black text-lg shadow-xl uppercase tracking-widest transition-all active:scale-95 flex justify-center items-center gap-2 ${
                  isProcessing 
                  ? 'bg-slate-800 text-slate-500 cursor-wait' 
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {isProcessing ? 'Conectando con Mercado Pago...' : (
                  <>Pagar Ahora <CreditCard className="w-5 h-5" /></>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold pt-4">
                <ShieldCheck className="w-4 h-4" /> Pago 100% encriptado
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// Icono auxiliar si el carrito está vacío
function ShoppingCartIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}