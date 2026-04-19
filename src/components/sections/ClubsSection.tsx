"use client"

import { MapPin, ArrowRight } from "lucide-react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

const CLUBS = [
  { name: "Cumbayá Pickleball", city: "Quito", courts: 6, tag: "Nuevo", gradient: "from-emerald-600 to-teal-800" },
  { name: "Rancho San Francisco", city: "Quito", courts: 4, gradient: "from-emerald-800 to-green-950" },
  { name: "Academia Norte", city: "Guayaquil", courts: 8, tag: "Verificado", gradient: "from-teal-600 to-emerald-900" },
  { name: "Tumbaco Paddle Club", city: "Tumbaco", courts: 3, gradient: "from-green-700 to-emerald-950" },
]

export function ClubsSection() {
  return (
    <section id="clubs" className="bg-muted py-24 px-6 sm:px-8">
      <div className="container mx-auto" style={{ maxWidth: 1280 }}>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <ScrollReveal>
              <span className="chip mb-4">
                <span className="chip-dot" /> Clubes verificados
              </span>
              <h2
                className="font-black text-foreground uppercase leading-[0.95] tracking-[-0.03em]"
                style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", marginTop: 16 }}
              >
                Canchas cerca de ti<span className="text-primary">.</span>
              </h2>
            </ScrollReveal>
          </div>
          <a
            href="#"
            className="btn-pill border border-foreground/30 text-foreground hover:border-foreground px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CLUBS.map((c, i) => (
            <ScrollReveal key={c.name} delay={i * 0.07}>
              <div className="group bg-white border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] cursor-pointer">
                {/* Thumbnail */}
                <div className={`h-[148px] bg-gradient-to-br ${c.gradient} relative overflow-hidden`}>
                  {/* Court lines decoration */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: "repeating-linear-gradient(90deg, white 0px, white 1px, transparent 1px, transparent 32px), repeating-linear-gradient(0deg, white 0px, white 1px, transparent 1px, transparent 32px)"
                  }} />
                  {c.tag && (
                    <span className="absolute top-3 left-3 bg-black/55 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-[0.12em] uppercase">
                      {c.tag}
                    </span>
                  )}
                  {/* Court count badge */}
                  <span className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {c.courts} canchas
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-black text-foreground uppercase tracking-[-0.03em] text-base leading-tight">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[12px] mt-2">
                    <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                    {c.city}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
