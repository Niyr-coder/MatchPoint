"use client"

import { motion } from "framer-motion"
import { MapPin, Navigation } from "lucide-react"

interface Cancha {
  id: string
  nombre: string
  deporte: string
  distancia: string
}

const PLACEHOLDER_CANCHAS: Cancha[] = [
  { id: "1", nombre: "Club Pichincha", deporte: "Pádel · Tenis", distancia: "0.8 km" },
  { id: "2", nombre: "SportCenter Norte", deporte: "Fútbol 5", distancia: "2.1 km" },
  { id: "3", nombre: "Racket Club", deporte: "Tenis · Pickleball", distancia: "3.4 km" },
]

export function CanchasMapPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#bbf7d0]">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-[#16a34a]/10 flex items-center justify-center">
            <MapPin className="size-4 text-[#16a34a]" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-tight text-[#0a0a0a]">
            Canchas Cerca
          </h2>
        </div>
        <span className="text-[11px] font-black text-[#16a34a] bg-[#16a34a]/10 px-2.5 py-0.5 rounded-full">
          &lt; 5 km
        </span>
      </div>

      {/* Map placeholder */}
      <div className="mx-4 mt-4 rounded-xl bg-[#e2f3e8] border-2 border-dashed border-[#86efac] flex flex-col items-center justify-center gap-2 py-10">
        <Navigation className="size-7 text-[#16a34a]/50" />
        <p className="text-xs font-bold text-[#16a34a]/60 text-center">
          Mapa interactivo próximamente
        </p>
        <p className="text-[10px] text-[#16a34a]/40 text-center">
          GPS · Vista satelital · Filtros por deporte
        </p>
      </div>

      {/* Cancha mini-cards */}
      <div className="flex-1 divide-y divide-[#bbf7d0] mt-2">
        {PLACEHOLDER_CANCHAS.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-6 py-3">
            <div className="size-8 rounded-lg bg-[#16a34a]/10 flex items-center justify-center shrink-0">
              <MapPin className="size-3.5 text-[#16a34a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0a0a0a]">{c.nombre}</p>
              <p className="text-[11px] text-[#16a34a]/70">{c.deporte}</p>
            </div>
            <span className="text-[11px] font-black text-[#16a34a]">{c.distancia}</span>
          </div>
        ))}
      </div>

      <div className="px-6 py-3">
        <a href="/dashboard/search" className="text-[11px] font-bold text-[#16a34a] hover:underline">
          Ver todas las canchas →
        </a>
      </div>
    </motion.div>
  )
}
