"use client"

import { ScrollReveal } from "@/components/shared/ScrollReveal"

const STATS = [
  { value: "5,000+", label: "Jugadores activos" },
  { value: "200+", label: "Canchas disponibles" },
  { value: "120", label: "Torneos jugados" },
  { value: "24/7", label: "Reservas abiertas" },
]

export function StatsSection() {
  return (
    <section className="bg-[#0a0a0a] text-white py-24 px-6 sm:px-8">
      <div
        className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        style={{ maxWidth: 1280 }}
      >
        {STATS.map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 0.08}>
            <div>
              <div
                className="font-black tracking-[-0.03em] leading-[0.9]"
                style={{ fontSize: "clamp(3rem, 6vw, 5rem)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-heading)" }}
              >
                {s.value}
              </div>
              <div className="mt-3 text-[11px] font-black tracking-[0.2em] uppercase text-[#34d399]">
                {s.label}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
