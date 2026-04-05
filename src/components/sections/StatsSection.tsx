"use client"

import { Users, Trophy, MapPin, Star, type LucideIcon } from "lucide-react"
import { AnimatedCounter } from "@/components/shared/AnimatedCounter"

interface StatItemProps {
  icon: LucideIcon
  value: number
  suffix: string
  label: string
  index: number
}

function StatItem({ icon: Icon, value, suffix, label, index }: StatItemProps) {
  return (
    <div
      className="animate-fade-in-up-16 text-center"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-[#0a0a0a]" />
      </div>
      <p className="text-4xl md:text-5xl font-black text-[#0a0a0a] tracking-tight tabular-nums">
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
      <p className="text-sm font-semibold text-[#737373] uppercase tracking-widest mt-2">
        {label}
      </p>
    </div>
  )
}

const STATS_WITH_ICONS = [
  { icon: Users, value: 5000, suffix: "+", label: "Jugadores activos" },
  { icon: Trophy, value: 4, suffix: "", label: "🏓 Pickleball + 3 deportes" },
  { icon: MapPin, value: 200, suffix: "+", label: "Canchas disponibles" },
  { icon: Star, value: 98, suffix: "%", label: "Satisfacción" },
] as const

export function StatsSection() {
  return (
    <section id="stats" className="bg-white py-24 border-t-2 border-[#16a34a]">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="animate-fade-in-up-16 mb-16">
          <p className="label-green">Comunidad</p>
          <h2
            className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            Donde el juego<br />se vive.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {STATS_WITH_ICONS.map((stat, i) => (
            <StatItem key={stat.label} {...stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
