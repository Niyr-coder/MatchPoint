"use client"

import { MapPin } from "lucide-react"
import { ScrollReveal } from "@/components/shared/ScrollReveal"

const CLUBS = [
  { name: "Cumbayá Pickleball", city: "Quito", courts: 6, tag: "Nuevo" },
  { name: "Rancho San Francisco", city: "Quito", courts: 4 },
  { name: "Academia Norte", city: "Guayaquil", courts: 8, tag: "Verificado" },
  { name: "Tumbaco Paddle Club", city: "Tumbaco", courts: 3 },
]

export function ClubsSection() {
  return (
    <section id="clubs" className="bg-muted py-24 px-6 sm:px-8">
      <div className="container mx-auto" style={{ maxWidth: 1280 }}>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <ScrollReveal>
              <span className="chip mb-4">
                <span className="chip-dot" /> Clubes
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
            className="btn-pill border border-foreground text-foreground px-5 py-2.5 text-xs font-black uppercase tracking-wider"
          >
            Ver todos
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CLUBS.map((c, i) => (
            <ScrollReveal key={c.name} delay={i * 0.07}>
              <div className="bg-white border border-border rounded-2xl overflow-hidden card-hover">
                {/* Image placeholder */}
                <div className="h-[140px] bg-gradient-to-br from-primary to-emerald-700 relative">
                  {c.tag && (
                    <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-[0.15em] uppercase">
                      {c.tag}
                    </span>
                  )}
                </div>
                <div className="p-4.5">
                  <h3 className="font-black text-foreground uppercase tracking-[-0.03em] text-lg leading-none">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[13px] mt-2.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {c.city} · {c.courts} canchas
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
