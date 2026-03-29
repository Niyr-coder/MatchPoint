"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Calendar, Clock } from "lucide-react"
import type { Reservation } from "@/lib/reservations/queries"

interface ReservasPanelProps {
  reservations: Reservation[]
  inviteCount: number
}

type DisplayStatus = "confirmada" | "pendiente" | "cancelada"

const STATUS_STYLES: Record<DisplayStatus, { label: string; classes: string }> = {
  confirmada: { label: "Confirmada", classes: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  pendiente: { label: "Pendiente", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelada: { label: "Cancelada", classes: "bg-red-50 text-red-600 border-red-200" },
}

const STATUS_MAP: Record<string, DisplayStatus> = {
  confirmed: "confirmada",
  pending: "pendiente",
  cancelled: "cancelada",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return "Hoy"
  if (date.toDateString() === tomorrow.toDateString()) return "Mañana"

  return date.toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short" })
}

export function ReservasPanel({ reservations, inviteCount }: ReservasPanelProps) {
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
          href="/dashboard/reservations/new"
          className="text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 bg-[#0a0a0a] text-white rounded-full hover:bg-[#222] transition-colors"
        >
          Nueva
        </Link>
      </div>

      {/* Reservation list */}
      <div className="flex-1 divide-y divide-[#f0f0f0]">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Clock className="size-7 text-zinc-300" />
            <p className="text-xs font-bold text-zinc-400">Sin reservas próximas</p>
            <Link href="/dashboard/reservations/new" className="text-[11px] font-bold text-[#1a56db] hover:underline">
              Reservar una cancha →
            </Link>
          </div>
        ) : (
          reservations.map((r) => {
            const displayStatus = STATUS_MAP[r.status] ?? "pendiente"
            const st = STATUS_STYLES[displayStatus]
            const courtName = [r.courts?.name, r.courts?.clubs?.name].filter(Boolean).join(" — ")

            return (
              <div key={r.id} className="flex items-center gap-3 px-6 py-3.5">
                <div className="size-9 rounded-xl bg-[#f5f5f5] flex items-center justify-center shrink-0">
                  <Clock className="size-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0a0a0a] truncate">{courtName || "Cancha"}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {r.courts?.sport ?? ""} · {formatDate(r.date)} · {r.start_time.slice(0, 5)}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                  {st.label}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#f0f0f0]">
        {inviteCount > 0 ? (
          <Link href="/dashboard/reservations" className="text-[11px] font-bold text-[#16a34a] hover:underline">
            Ver invitaciones ({inviteCount}) →
          </Link>
        ) : (
          <Link href="/dashboard/reservations" className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600 hover:underline">
            Ver historial de reservas →
          </Link>
        )}
      </div>
    </motion.div>
  )
}
