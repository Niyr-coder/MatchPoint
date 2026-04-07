"use client"

import { Search, Calendar, TrendingUp, ArrowRight, type LucideIcon } from "lucide-react"

interface StepProps {
  number: string
  icon: LucideIcon
  title: string
  desc: string
  index: number
}

function Step({ number, icon: Icon, title, desc, index }: StepProps) {
  return (
    <div
      className="animate-fade-in-up text-left"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center gap-4 mb-6">
        <span className="text-6xl font-black text-white/10 leading-none select-none">
          {number}
        </span>
        <div className="w-12 h-12 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-[#16a34a]" />
        </div>
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">{title}</h3>
      <p className="text-white/50 font-medium leading-relaxed">{desc}</p>
    </div>
  )
}

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "BUSCA TU CANCHA",
    desc: "Filtra por deporte, ubicación y horario. Solo canchas verificadas con disponibilidad en tiempo real.",
  },
  {
    number: "02",
    icon: Calendar,
    title: "RESERVA AL INSTANTE",
    desc: "Paga en línea, confirma tu horario y listo. Sin llamadas, sin esperas, sin excusas para no jugar.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "SUBE TU NIVEL",
    desc: "Cada partido cuenta. Tu rating sube, desbloqueas torneos y la comunidad conoce tu nombre.",
  },
]

export function FeaturesSection() {
  return (
    <section id="como-funciona" className="section-dark py-24 border-t border-white/5">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="animate-fade-in-up-16">
          <p className="label-green">Cómo funciona</p>
          <h2
            className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em] mb-16"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            DE CERO A CANCHA<br />EN 60 SEGUNDOS.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {STEPS.map((step, i) => (
            <Step key={step.number} {...step} index={i} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <a href="/login" className="btn-pill bg-[#16a34a] text-white px-10 py-3.5 inline-flex items-center gap-2">
            Empieza Ahora <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
