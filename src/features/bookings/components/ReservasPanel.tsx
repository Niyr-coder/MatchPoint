"use client"

import Link from "next/link"
import { Calendar, Clock } from "lucide-react"
import type { Reservation } from "@/features/bookings/types"

interface ReservasPanelProps {
  reservations: Reservation[]
}

type DisplayStatus = "confirmada" | "pendiente" | "cancelada"

const STATUS_STYLES: Record<DisplayStatus, { label: string; bg: string; text: string; border?: string }> = {
  confirmada: { label: "Confirmada", bg: "rgba(16,185,129,0.12)", text: "var(--primary)" },
  pendiente: { label: "Pendiente pago", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  cancelada: { label: "Cancelada", bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
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

function PanelHeader({ title, cta, ctaHref }: { title: string; cta: string; ctaHref: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
      <h2 className="text-sm font-black uppercase tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h2>
      <Link href={ctaHref} className="text-[11px] font-black uppercase tracking-[0.1em] text-primary hover:underline">
        {cta} →
      </Link>
    </div>
  )
}

export function ReservasPanel({ reservations }: ReservasPanelProps) {
  return (
    <div className="animate-fade-in-up rounded-2xl overflow-hidden bg-card border border-border">
      <PanelHeader title="Próximas reservas" cta="Ver todas" ctaHref="/dashboard/reservations" />

      {reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Clock className="size-7 text-zinc-300" />
          <p className="text-xs font-bold text-zinc-400">Sin reservas próximas</p>
          <Link href="/dashboard/reservations/new" className="text-[11px] font-bold text-foreground hover:underline">
            Reservar una cancha →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {reservations.map((r, i) => {
            const displayStatus = STATUS_MAP[r.status] ?? "pendiente"
            const st = STATUS_STYLES[displayStatus]
            const courtName = [r.courts?.name, r.courts?.clubs?.name].filter(Boolean).join(" · ")

            return (
              <div key={r.id} className="flex items-center gap-3.5 px-5 py-3.5" style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="w-11 h-11 rounded-[10px] bg-[#f0fdf4] text-primary flex items-center justify-center shrink-0">
                  <Calendar className="w-[18px] h-[18px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                    {formatDate(r.date)} · {r.start_time.slice(0, 5)}
                  </p>
                  <p className="text-sm font-bold mt-0.5 truncate">{courtName || "Cancha"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {r.courts?.sport ?? "Pickleball"}
                  </p>
                </div>
                <span
                  className="text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                  style={{
                    background: st.bg,
                    color: st.text,
                    border: st.border ? `1px solid ${st.border}` : "none",
                  }}
                >
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
