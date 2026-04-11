"use client"

import { Users, Trophy, MapPin, MapPinned, type LucideIcon } from "lucide-react"
import { AnimatedCounter } from "@/components/shared/AnimatedCounter"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

interface StatItemProps {
  icon: LucideIcon
  value: number
  suffix: string
  label: string
  index: number
}

function StatItem({ icon: Icon, value, suffix, label, index }: StatItemProps) {
  return (
    <ScrollReveal delay={index * 0.08}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <p className="text-4xl md:text-5xl font-black text-foreground tracking-tight tabular-nums">
          <AnimatedCounter value={value} suffix={suffix} />
        </p>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-2">
          {label}
        </p>
      </div>
    </ScrollReveal>
  )
}

const STATS_WITH_ICONS = [
  { icon: Users, value: 5000, suffix: "+", label: "Jugadores activos" },
  { icon: Trophy, value: 50, suffix: "+", label: "Torneos jugados" },
  { icon: MapPin, value: 200, suffix: "+", label: "Canchas disponibles" },
  { icon: MapPinned, value: 15, suffix: "+", label: "Ciudades en Ecuador" },
] as const

export function StatsSection() {
  return (
    <section id="stats" className="bg-card py-24 border-t border-border">
      <div className="container mx-auto px-6 sm:px-8">
        <ScrollReveal className="mb-16">
          <p className="label-green">Comunidad</p>
          <h2
            className="font-black text-foreground uppercase leading-[0.88] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 6rem)" }}
          >
            NÚMEROS QUE HABLAN.
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {STATS_WITH_ICONS.map((stat, i) => (
            <StatItem key={stat.label} {...stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
