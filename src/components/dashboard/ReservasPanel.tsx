"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Calendar, Clock } from "lucide-react"

interface Reserva {
  id: string
  cancha: string
  deporte: string
  fecha: string
  hora: string
  status: "confirmada" | "pendiente" | "invitacion"
}

const PLACEHOLDER_RESERVAS: Reserva[] = [
  { id: "1", cancha: "Cancha 3 — Club Pichincha", deporte: "Pádel", fecha: "Hoy", hora: "18:00", status: "confirmada" },
  { id: "2", cancha: "Cancha A — SportCenter", deporte: "Tenis", fecha: "Mañana", hora: "10:30", status: "pendiente" },
  { id: "3", cancha: "Cancha 1 — Fútbol 5", deporte: "Fútbol", fecha: "Sáb 5 Abr", hora: "16:00", status: "invitacion" },
]

const STATUS_STYLES: Record<Reserva["status"], { label: string; classes: string }> = {
  confirmada: { label: "Confirmada", classes: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  pendiente: { label: "Pendiente", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  invitacion: { label: "Invitación", classes: "bg-blue-50 text-blue-700 border-blue-200" },
}

export function ReservasPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Calendar className="size-4 text-zinc-500" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-tight text-[#0a0a0a]">
            Mis Reservas
          </h2>
        </div>
        <Link
          href="/dashboard/reservations"
          className="text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 bg-[#0a0a0a] text-white rounded-full hover:bg-[#222] transition-colors"
        >
          Nueva
        </Link>
      </div>

      {/* Reservation list */}
      <div className="flex-1 divide-y divide-[#f0f0f0]">
        {PLACEHOLDER_RESERVAS.map((r) => {
          const st = STATUS_STYLES[r.status]
          return (
            <div key={r.id} className="flex items-center gap-3 px-6 py-3.5">
              <div className="size-9 rounded-xl bg-[#f5f5f5] flex items-center justify-center shrink-0">
                <Clock className="size-3.5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0a0a0a] truncate">{r.cancha}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{r.deporte} · {r.fecha} · {r.hora}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                {st.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#f0f0f0]">
        <Link
          href="/dashboard/reservations"
          className="text-[11px] font-bold text-[#16a34a] hover:underline"
        >
          Ver invitaciones (2) →
        </Link>
      </div>
    </motion.div>
  )
}
