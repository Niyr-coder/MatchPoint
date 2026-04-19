"use client"

import { ScrollReveal } from "@/components/shared/ScrollReveal"

const STATS = [
  { value: "5,000+", label: "Jugadores activos", note: "creciendo cada semana" },
  { value: "200+", label: "Canchas disponibles", note: "en 3 ciudades" },
  { value: "120", label: "Torneos jugados", note: "amateurs y ligas" },
  { value: "24/7", label: "Reservas abiertas", note: "sin llamadas" },
]

export function StatsSection() {
  return (
    <section className="bg-[#0a0a0a] text-white py-20 px-6 sm:px-8 overflow-hidden relative">
      {/* Subtle green glow behind numbers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(16,185,129,0.06),transparent_70%)] pointer-events-none" />

      <div
        className="relative container mx-auto"
        style={{ maxWidth: 1280 }}
      >
        {/* Top rule */}
        <div className="w-full h-px bg-white/[0.06] mb-16" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8">
          {STATS.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 0.08}>
              <div className="group">
                <div
                  className="font-black tracking-[-0.04em] leading-[0.88] text-white transition-colors duration-200 group-hover:text-[#34d399]"
                  style={{ fontSize: "clamp(2.75rem, 5.5vw, 4.75rem)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-heading)" }}
                >
                  {s.value}
                </div>
                <div className="mt-3 text-[11px] font-black tracking-[0.18em] uppercase text-[#34d399]">
                  {s.label}
                </div>
                <div className="mt-1.5 text-[11px] text-white/30 font-medium">
                  {s.note}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom rule */}
        <div className="w-full h-px bg-white/[0.06] mt-16" />
      </div>
    </section>
  )
}
