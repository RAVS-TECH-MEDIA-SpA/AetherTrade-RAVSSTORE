import { Globe, Cpu, Truck } from 'lucide-react';

const steps = [
  {
    icon: <Cpu className="w-8 h-8" />,
    title: "Curación Global con IA",
    desc: "Nuestro motor analiza tendencias en tiempo real en los mercados más competitivos de Asia y EE.UU. para seleccionar solo productos ganadores."
  },
  {
    icon: <Globe className="w-8 h-8" />,
    title: "Importación Directa",
    desc: "Sin intermediarios. Ravstore gestiona la logística internacional para garantizar tecnología de punta a precios de origen."
  },
  {
    icon: <Truck className="w-8 h-8" />,
    title: "Distribución en Chile",
    desc: "Contamos con centros de distribución estratégicos en Chile para asegurar entregas rápidas y seguras en todo el territorio nacional."
  }
];

export const HowItWorks = () => (
  <section id="como-funciona" className="py-32 bg-[#020617] border-t border-white/5">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-20">
        <h2 className="text-4xl lg:text-6xl font-black text-white italic uppercase tracking-tighter mb-4">
          Tecnología <span className="text-violet-500">Sin Fronteras</span>
        </h2>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">El estándar Ravstore para el mundo</p>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        {steps.map((step, i) => (
          <div key={i} className="group p-10 rounded-[3rem] bg-slate-900/30 border border-white/5 hover:border-violet-500/30 transition-all duration-500">
            <div className="text-violet-500 mb-6 group-hover:scale-110 transition-transform duration-500">
              {step.icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-4 uppercase italic tracking-tight">{step.title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm font-medium">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);