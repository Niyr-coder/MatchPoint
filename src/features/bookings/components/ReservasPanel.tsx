"use client"

import Link from "next/link"
import { Calendar, Clock } from "lucide-react"
import type { Reservation } from "@/features/bookings/types"

interface ReservasPanelProps {
  reservations: Reservation[]
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

export function ReservasPanel({ reservations }: ReservasPanelProps) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl overflow-hidden flex flex-col bg-card border border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
        <div className="flex items-center gap-2">
          <div
            className="size-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #fff7ed, #fed7aa)" }}
          >
            <Calendar className="size-4 text-orange-500" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-tight text-foreground">
            Mis Reservas
          </h2>
        </div>
        <Link
          href="/dashboard/reservations/new"
          className="text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 bg-foreground text-white rounded-full hover:bg-[#222] transition-colors"
        >
          Nueva
        </Link>
      </div>

      {/* Reservation list */}
      <div className="flex-1 divide-y divide-zinc-50">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Clock className="size-7 text-zinc-300" />
            <p className="text-xs font-bold text-zinc-400">Sin reservas próximas</p>
            <Link href="/dashboard/reservations/new" className="text-[11px] font-bold text-foreground hover:underline">
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
                <div className="size-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Clock className="size-3.5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{courtName || "Cancha"}</p>
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
      <div className="px-6 py-3 border-t border-zinc-50">
        <Link href="/dashboard/reservations" className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600 hover:underline">
          Ver historial de reservas →
        </Link>
      </div>
    </div>
  )
}
