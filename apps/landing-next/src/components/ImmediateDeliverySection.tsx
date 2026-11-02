import { BadgeCheck, MapPin, PackageCheck, Truck } from 'lucide-react';

const demoProducts = [
  { title: 'Organizador compacto para el hogar', price: '$19.990', tag: 'Hogar' },
  { title: 'Luz portátil recargable', price: '$24.990', tag: 'Tecnología' },
  { title: 'Accesorio práctico para viajes', price: '$14.990', tag: 'Viajes' }
];

export default function ImmediateDeliverySection() {
  return (
    <section id="entrega-inmediata" className="container mx-auto px-4 py-8 md:py-12" aria-labelledby="immediate-delivery-title">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 p-5 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <Truck className="h-4 w-4" />
              Entrega inmediata · Vista previa
            </div>
            <h2 id="immediate-delivery-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Tus favoritos, más cerca
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Una selección de productos con disponibilidad local para recibirlos antes.
              Plazos y cobertura se confirmarán en cada producto cuando el catálogo esté habilitado.
            </p>
            <p className="mt-3 text-xs font-semibold text-amber-200/90">
              Demostración visual: estos productos no están disponibles para compra.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <MapPin className="h-4 w-4 text-emerald-300" />
            Selección para Chile
          </div>
        </div>

        <div className="relative z-10 mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {demoProducts.map((product, index) => (
            <article key={product.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className={`mb-4 flex aspect-[1.65] items-center justify-center rounded-xl ${
                index === 1 ? 'bg-gradient-to-br from-cyan-900/70 to-slate-900' :
                  index === 2 ? 'bg-gradient-to-br from-violet-900/70 to-slate-900' :
                    'bg-gradient-to-br from-emerald-900/70 to-slate-900'
              }`}>
                <PackageCheck className="h-10 w-10 text-white/80" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {product.tag}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" /> Stock local
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">{product.title}</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-black text-white">{product.price}</span>
                <span className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Próximamente
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
