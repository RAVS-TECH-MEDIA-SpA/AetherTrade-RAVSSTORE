import Link from 'next/link';
import { ArrowDown, ArrowRight, BadgeCheck, PackageCheck, Sparkles, Truck } from 'lucide-react';

interface StorefrontHeroProps {
  countryName: string;
}

export default function StorefrontHero({ countryName }: StorefrontHeroProps) {
  return (
    <section className="container mx-auto px-4 pb-8 pt-5 md:pb-12 md:pt-8">
      <div className="storefront-hero relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#080d1b] px-5 py-10 shadow-2xl shadow-violet-950/20 sm:px-8 md:px-12 md:py-14 lg:min-h-[470px] lg:px-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_42%,rgba(124,58,237,0.22),transparent_44%),radial-gradient(ellipse_at_5%_100%,rgba(14,165,233,0.12),transparent_36%)]" />
        <div className="pointer-events-none absolute -right-20 top-0 -z-10 h-80 w-80 rounded-full border border-white/5 sm:right-10 sm:top-8 sm:h-[28rem] sm:w-[28rem]" />
        <div className="pointer-events-none absolute -right-8 top-12 -z-10 h-64 w-64 rounded-full border border-violet-300/10 sm:right-20 sm:top-16 sm:h-96 sm:w-96" />

        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200 sm:text-xs">
              <Sparkles className="h-4 w-4" />
              Ideas que vale la pena descubrir
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Encuentra algo
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                que te sorprenda.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Gadgets y novedades seleccionados para hacer más simples tus días.
              Explora la colección de RavsStore y encuentra tu próximo favorito.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#tendencias"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                Explorar productos <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#entrega-inmediata"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Truck className="h-4 w-4 text-emerald-300" /> Ver entrega inmediata
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-300">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Compra protegida</span>
              <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-sky-300" /> Para {countryName}</span>
            </div>
          </div>

          <div className="relative mx-auto flex min-h-64 w-full max-w-md items-center justify-center sm:min-h-80">
            <div className="absolute h-52 w-52 rounded-full bg-violet-500/20 blur-3xl sm:h-64 sm:w-64" />
            <div className="relative w-full max-w-sm rotate-[-3deg] rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Colección destacada</p>
                  <p className="mt-1 text-lg font-black text-white">Descubre lo nuevo</p>
                </div>
                <span className="rounded-xl bg-violet-500/20 p-2.5 text-violet-200"><Sparkles className="h-5 w-5" /></span>
              </div>

              <div className="my-4 grid grid-cols-2 gap-3">
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-950/70">
                  <PackageCheck className="h-12 w-12 text-sky-100/90 sm:h-14 sm:w-14" />
                </div>
                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Selección RavsStore</span>
                  <div>
                    <div className="mb-2 h-2 w-4/5 rounded-full bg-white/15" />
                    <div className="h-2 w-3/5 rounded-full bg-white/10" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Explora la colección</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="text-xs font-semibold text-slate-300">Una buena idea está más cerca</span>
                <ArrowDown className="h-4 w-4 text-violet-300" />
              </div>
            </div>
            <div className="absolute -bottom-1 right-0 hidden items-center gap-2 rounded-xl border border-emerald-300/20 bg-slate-950/90 px-4 py-3 text-xs font-bold text-emerald-100 shadow-xl sm:flex">
              <BadgeCheck className="h-4 w-4 text-emerald-300" /> Hecho para comprar con confianza
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
