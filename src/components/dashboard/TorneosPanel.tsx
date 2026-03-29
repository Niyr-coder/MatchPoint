"use client"

import { motion } from "framer-motion"
import { Trophy, Users, Plus } from "lucide-react"
import Link from "next/link"

interface Torneo {
  id: string
  nombre: string
  deporte: string
  fecha: string
  participantes: string
  estado: "abierto" | "proximo" | "en_curso"
}

const PLACEHOLDER_TORNEOS: Torneo[] = [
  { id: "1", nombre: "Copa Pádel Quito 2025", deporte: "Pádel", fecha: "15 Abr", participantes: "12/16", estado: "abierto" },
  { id: "2", nombre: "Torneo Fútbol 5 Primavera", deporte: "Fútbol 5", fecha: "22 Abr", participantes: "8/12", estado: "abierto" },
  { id: "3", nombre: "Open de Tenis Norte", deporte: "Tenis", fecha: "3 May", participantes: "4/32", estado: "proximo" },
  { id: "4", nombre: "Liga Pickleball Amateur", deporte: "Pickleball", fecha: "10 May", participantes: "16/20", estado: "en_curso" },
]

const ESTADO_STYLES: Record<Torneo["estado"], { label: string; classes: string }> = {
  abierto: { label: "Abierto", classes: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  proximo: { label: "Próximo", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  en_curso: { label: "En curso", classes: "bg-amber-50 text-amber-700 border-amber-200" },
}

export function TorneosPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.21, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl overflow-hidden"
      style={{ background: "#1a56db" }}
    >

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Trophy className="size-4 text-white" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-tight text-white">
              Torneos
            </h2>
          </div>
          <Link
            href="/dashboard/tournaments/create"
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 bg-white text-[#1d4ed8] rounded-full hover:bg-white/90 transition-colors"
          >
            <Plus className="size-3" />
            Crear Torneo
          </Link>
        </div>

        {/* Horizontal scroll tournament cards */}
        <div className="flex gap-4 overflow-x-auto px-6 py-5 scrollbar-hide">
          {PLACEHOLDER_TORNEOS.map((t) => {
            const est = ESTADO_STYLES[t.estado]
            return (
              <div
                key={t.id}
                className="shrink-0 w-52 rounded-xl bg-white/15 border border-white/20 p-4 hover:bg-white/25 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${est.classes}`}>
                    {est.label}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white leading-tight mb-1">{t.nombre}</h3>
                <p className="text-[11px] text-white/70 mb-3">{t.deporte}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Users className="size-3 text-white/60" />
                    <span className="text-[11px] font-bold text-white/70">{t.participantes}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white/70">{t.fecha}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4">
          <Link href="/dashboard/tournaments" className="text-[11px] font-bold text-white/80 hover:text-white hover:underline transition-colors">
            Ver todos los torneos →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
