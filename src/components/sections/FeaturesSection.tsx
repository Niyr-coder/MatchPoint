"use client"

import { Users, Zap, TrendingUp, Trophy, CalendarDays, ShieldCheck, type LucideIcon } from "lucide-react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

interface Feature {
  icon: LucideIcon
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  { icon: Users, title: "Rivales de tu nivel", desc: "El algoritmo te conecta con jugadores que te van a exigir — ni muy fácil, ni imposible." },
  { icon: Zap, title: "Reserva en 30 segundos", desc: "Sin llamadas, sin WhatsApps. Elige cancha, elige horario, listo." },
  { icon: TrendingUp, title: "Tu ranking sube con cada partido", desc: "Cada punto cuenta. La comunidad ve tu progreso en tiempo real." },
  { icon: Trophy, title: "Torneos locales", desc: "Compite en tu ciudad. Desde amateurs hasta ligas organizadas." },
  { icon: CalendarDays, title: "Agenda viva", desc: "Reservas, quedadas, torneos y clases en un solo calendario." },
  { icon: ShieldCheck, title: "Clubes verificados", desc: "Solo canchas revisadas con disponibilidad confirmada." },
]

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon
  return (
    <ScrollReveal delay={index * 0.07}>
      <div className="bg-white border border-border rounded-2xl p-7 cursor-pointer card-hover h-full">
        <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] text-primary flex items-center justify-center mb-5">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-black text-foreground uppercase tracking-[-0.03em] text-xl leading-none mb-3">
          {feature.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {feature.desc}
        </p>
      </div>
    </ScrollReveal>
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-24 px-6 sm:px-8">
      <div className="container mx-auto" style={{ maxWidth: 1280 }}>
        <ScrollReveal>
          <span className="chip mb-4">
            <span className="chip-dot" /> Por qué MatchPoint
          </span>
          <h2
            className="font-black text-foreground uppercase leading-[0.95] tracking-[-0.03em] max-w-3xl"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", margin: "16px 0 0" }}
          >
            Todo lo que necesitas para jugar<span className="text-primary">.</span>
          </h2>
          <p className="text-muted-foreground max-w-[540px] leading-relaxed" style={{ fontSize: 17, margin: "20px 0 64px" }}>
            Seis herramientas. Un solo lugar. Cero fricción.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
