'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '@/store/cartStore';
import { ShieldCheck, Truck, CreditCard, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import InitiateCheckoutTracker from './components/InitiateCheckoutTracker';
import { getMetaCookies } from '@/lib/metaPixel';
import Script from 'next/script'; 

// ⚡ DICCIONARIO COMPLETO DE REGIONES Y COMUNAS DE CHILE
const regionesYcomunas = {
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"],
  "Antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"],
  "Atacama": ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"],
  "Coquimbo": ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paihuano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"],
  "Valparaíso": ["Valparaíso", "Casablanca", "Concón", "Juan Fernández", "Puchuncaví", "Quintero", "Viña del Mar", "Isla de Pascua", "Los Andes", "Calle Larga", "Rinconada", "San Esteban", "La Ligua", "Cabildo", "Papudo", "Petorca", "Zapallar", "Quillota", "Calera", "Hijuelas", "La Cruz", "Nogales", "San Antonio", "Algarrobo", "Cartagena", "El Quisco", "El Tabo", "Santo Domingo", "San Felipe", "Catemu", "Llaillay", "Panquehue", "Putaendo", "Santa María", "Quilpué", "Limache", "Olmué", "Villa Alemana"],
  "Región Metropolitana": ["Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Santiago", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo", "Colina", "Lampa", "Tiltil", "San Bernardo", "Buin", "Calera de Tango", "Paine", "Melipilla", "Alhué", "Curacaví", "María Pinto", "San Pedro", "Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor"],
  "O'Higgins": ["Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "Pichilemu", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "San Fernando", "Chépica", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Pumanque", "Santa Cruz"],
  "Maule": ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael", "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas"],
  "Ñuble": ["Cobquecura", "Coelemu", "Ninhue", "Portezuelo", "Quirihue", "Ránquil", "Treguaco", "Bulnes", "Chillán Viejo", "Chillán", "El Carmen", "Pemuco", "Pinto", "Quillón", "San Ignacio", "Yungay", "Coihueco", "Ñiquén", "San Carlos", "San Fabián", "San Nicolás"],
  "Biobío": ["Concepción", "Coronel", "Chiguayante", "Florida", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé", "Hualpén", "Lebu", "Arauco", "Cañete", "Contulmo", "Curanilahue", "Los Álamos", "Tirúa", "Los Ángeles", "Antuco", "Cabrero", "Laja", "Mulchén", "Nacimiento", "Negrete", "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel", "Yumbel", "Alto Biobío"],
  "La Araucanía": ["Temuco", "Carahue", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica", "Cholchol", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco", "Purén", "Renaico", "Traiguén", "Victoria"],
  "Los Ríos": ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"],
  "Los Lagos": ["Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Puerto Varas", "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao", "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Chaitén", "Futaleufú", "Hualaihué", "Palena"],
  "Aysén": ["Coihaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Cochrane", "O'Higgins", "Tortel", "Chile Chico", "Río Ibáñez"],
  "Magallanes": ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine"]
};

// ⚡ UTILIDADES DE NORMALIZACIÓN Y VALIDACIÓN
const formatRut = (rut: string) => {
  let cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleanRut.length > 9) cleanRut = cleanRut.slice(0, 9);
  if (cleanRut.length < 2) return cleanRut;
  
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
};

const isValidRut = (rut: string) => {
  if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
  const [body, dv] = rut.split('-');
  let rutNum = parseInt(body, 10);
  let m = 0, s = 1;
  for (; rutNum; rutNum = Math.floor(rutNum / 10)) {
    s = (s + rutNum % 10 * (9 - m++ % 6)) % 11;
  }
  const v = s > 0 ? (s - 1).toString() : 'K';
  return v === dv.toUpperCase();
};

const cleanText = (text: string) => text.trim().replace(/[<>]/g, '');

// Función para quitar acentos y pasar a minúsculas (ideal para comparar)
const normalizeString = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const mapGoogleRegionToLocal = (googleRegion: string): keyof typeof regionesYcomunas => {
  const g = normalizeString(googleRegion);
  if (g.includes('metropolitana')) return 'Región Metropolitana';
  if (g.includes('valparaiso')) return 'Valparaíso';
  if (g.includes('biobio') || g.includes('bio bio')) return 'Biobío';
  if (g.includes('arica')) return 'Arica y Parinacota';
  if (g.includes('tarapaca')) return 'Tarapacá';
  if (g.includes('antofagasta')) return 'Antofagasta';
  if (g.includes('atacama')) return 'Atacama';
  if (g.includes('coquimbo')) return 'Coquimbo';
  if (g.includes('higgins')) return "O'Higgins";
  if (g.includes('maule')) return 'Maule';
  if (g.includes('nuble')) return 'Ñuble';
  if (g.includes('araucania')) return 'La Araucanía';
  if (g.includes('rios')) return 'Los Ríos';
  if (g.includes('lagos')) return 'Los Lagos';
  if (g.includes('aysen')) return 'Aysén';
  if (g.includes('magallanes')) return 'Magallanes';
  return 'Región Metropolitana'; 
};

declare global {
  interface Window {
    MercadoPago: any;
    google: any;
  }
}

export default function CheckoutPage() {
  const { items, getTotalPrice } = useCartStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rutError, setRutError] = useState('');

  const addressInputRef = useRef<HTMLInputElement>(null);

  const [shippingData, setShippingData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    rut: '',
    phone: '+569',
    address: '',
    details: '',
    city: '', // Ahora inicia vacío para forzar la selección
    region: 'Región Metropolitana'
  });

  useEffect(() => { setIsMounted(true); }, []);

  const initGoogleAutocomplete = () => {
    if (!addressInputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: "cl" },
      fields: ["address_components", "formatted_address", "name"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      let street = "";
      let number = "S/N";
      let googleCity = "";
      let googleRegion = "Región Metropolitana";

      place.address_components.forEach((component: any) => {
        const types = component.types;
        if (types.includes("route")) street = component.long_name;
        if (types.includes("street_number")) number = component.long_name;
        if (types.includes("locality") || types.includes("administrative_area_level_3")) googleCity = component.long_name;
        if (types.includes("administrative_area_level_1")) googleRegion = component.long_name;
      });

      const fullStreet = street 
        ? (number !== "S/N" ? `${street} ${number}` : street) 
        : (place.name || addressInputRef.current?.value || "");
        
      const mappedRegion = mapGoogleRegionToLocal(googleRegion);
      
      // ⚡ Intentamos hacer match exacto (sin acentos) entre la comuna de Google y nuestra lista
      const comunasDisponibles = regionesYcomunas[mappedRegion];
      let matchedComuna = "";
      
      if (googleCity) {
        const normalizedGoogleCity = normalizeString(googleCity);
        matchedComuna = comunasDisponibles.find(c => normalizeString(c) === normalizedGoogleCity) || "";
      }

      setShippingData(prev => ({
        ...prev,
        address: fullStreet,
        region: mappedRegion,
        city: matchedComuna // Si no hace match, queda vacío y obliga al usuario a elegir del select
      }));

      if (addressInputRef.current) {
        addressInputRef.current.value = fullStreet;
      }
    });
  };

  const total = getTotalPrice();
  const formattedTotal = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP'
  }).format(total);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    if (name === 'rut') {
      value = formatRut(value);
      setRutError(''); 
    }

    if (name === 'phone') {
      let digits = value.replace(/\D/g, '');
      if (digits.startsWith('569')) digits = digits.slice(3);
      else if (digits.startsWith('56')) digits = digits.slice(2);
      else if (digits.startsWith('9')) digits = digits.slice(1);
      value = '+569' + digits.slice(0, 8);
    }
    
    // ⚡ Si el usuario cambia la región manualmente, limpiamos la comuna para evitar discordancias
    if (name === 'region') {
      setShippingData(prev => ({ ...prev, region: value, city: '' }));
      return;
    }
    
    setShippingData(prev => ({ ...prev, [name]: value }));
  };

  const handleRutBlur = () => {
    if (!shippingData.rut) return;
    const cleanRutNumber = shippingData.rut.replace(/\./g, '');
    if (!isValidRut(cleanRutNumber)) {
      setRutError('El RUT ingresado no es válido.');
    } else {
      setRutError(''); 
    }
  };
  
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanRutNumber = shippingData.rut.replace(/\./g, '');
    if (!isValidRut(cleanRutNumber)) {
      setRutError('Por favor, ingresa un RUT chileno válido.');
      document.getElementById('rut-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (shippingData.phone.length < 8) {
      alert("El número de teléfono es muy corto.");
      return;
    }
    // ⚡ Validación extra para asegurar que seleccionaron una comuna
    if (!shippingData.city) {
      alert("Por favor, selecciona tu comuna.");
      return;
    }

    setIsProcessing(true);

    try {
      const baseUrl = '/api/checkout';
      const { fbc, fbp } = getMetaCookies();
      localStorage.setItem('last_order_backup', JSON.stringify({ items, total: getTotalPrice() }));

      const payload = {
        customerInfo: {
          email: shippingData.email.trim().toLowerCase(),
          name: `${cleanText(shippingData.firstName)} ${cleanText(shippingData.lastName)}`,
          rut: cleanRutNumber,
          phone: shippingData.phone
        },
        shippingAddress: {
          street: cleanText(shippingData.address),
          number: "S/N", 
          city: cleanText(shippingData.city),
          state: shippingData.region,
          zip: "0000000",
          details: cleanText(shippingData.details)
        },
        items: items.map(item => ({
          product_id: item.productId, 
          variant_id: item.variantId, 
          quantity: item.quantity,
          title: cleanText(item.title),
          price: item.price
        })),
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

      const data = await response.json();
      const link_de_pago = data.init_point; 

      if (!link_de_pago) throw new Error("El servidor no devolvió el link de pago");

      window.location.href = link_de_pago;

    } catch (error: any) {
      alert(`Hubo un problema al procesar el pago: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

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

  // Obtenemos las comunas de la región actualmente seleccionada
  const comunasDisponibles = regionesYcomunas[shippingData.region as keyof typeof regionesYcomunas] || [];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
      <InitiateCheckoutTracker products={items.map(i => ({ id: i.productId }))} total={total} />

      <Script 
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={initGoogleAutocomplete}
      />

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
          
          <div className="flex-1 space-y-10">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest italic mb-6">Datos de Envío</h2>
              <form id="checkout-form" onSubmit={handlePayment} className="space-y-6">
                
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contacto</h3>
                  <div>
                    <input required type="email" name="email" value={shippingData.email} onChange={handleInputChange} placeholder="Correo electrónico" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                  </div>
                  <div>
                    <input required type="tel" name="phone" maxLength={12} value={shippingData.phone} onChange={handleInputChange} placeholder="Teléfono (Ej: +56912345678)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8">Dirección de Entrega</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" name="firstName" minLength={2} value={shippingData.firstName} onChange={handleInputChange} placeholder="Primer Nombre" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                    <input required type="text" name="lastName" minLength={2} value={shippingData.lastName} onChange={handleInputChange} placeholder="Apellidos" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" />
                  </div>
                  
                  <div>
                    <input 
                      id="rut-input" 
                      required 
                      type="text" 
                      name="rut" 
                      value={shippingData.rut} 
                      onChange={handleInputChange} 
                      onBlur={handleRutBlur}
                      placeholder="RUT (Ej: 12.345.678-9)" 
                      className={`w-full bg-white/5 border ${rutError ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all`} 
                    />
                    {rutError && <p className="text-red-400 text-xs mt-1 ml-1">{rutError}</p>}
                  </div>

                  <div>
                    <input 
                      ref={addressInputRef}
                      required 
                      type="text" 
                      name="address" 
                      value={shippingData.address} 
                      onChange={handleInputChange} 
                      placeholder="Busca tu dirección (Ej: Providencia 123) o escríbela manualmente..." 
                      className="w-full bg-white/5 border border-violet-500/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 transition-all" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1 ml-1">Powered by Google Maps</p>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      name="details" 
                      value={shippingData.details} 
                      onChange={handleInputChange} 
                      placeholder="Dpto, Casa, Torre, Block o Pasaje (Opcional)" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all" 
                    />
                  </div>

                  {/* ⚡ AQUI REEMPLAZAMOS EL INPUT DE COMUNA POR LOS DOS SELECTS */}
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      name="region" 
                      value={shippingData.region} 
                      onChange={handleInputChange} 
                      className="w-full bg-[#0a0f24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-all appearance-none"
                    >
                      {Object.keys(regionesYcomunas).map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>

                    <select 
                      required
                      name="city" 
                      value={shippingData.city} 
                      onChange={handleInputChange} 
                      className="w-full bg-[#0a0f24] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-all appearance-none"
                    >
                      <option value="" disabled>Selecciona tu comuna...</option>
                      {comunasDisponibles.map((comuna) => (
                        <option key={comuna} value={comuna}>{comuna}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>
          </div>

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
                {isProcessing ? 'Conectando...' : (
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

function ShoppingCartIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}