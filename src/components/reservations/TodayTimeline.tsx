"use client"

import { useState, useTransition } from "react"
import { CheckCircle } from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { ReservationWithProfile } from "@/lib/reservations/queries"

function getStatusVariant(status: string) {
  if (status === "confirmed") return "success" as const
  if (status === "pending") return "warning" as const
  return "neutral" as const
}

function getStatusLabel(status: string) {
  if (status === "confirmed") return "Confirmada"
  if (status === "pending") return "Pendiente"
  return "Cancelada"
}

interface TodayTimelineProps {
  initialReservations: ReservationWithProfile[]
  clubId: string
}

export function TodayTimeline({ initialReservations, clubId }: TodayTimelineProps) {
  const [reservations, setReservations] = useState(initialReservations)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sorted = [...reservations].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  )

  async function handleCheckin(id: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/club/${clubId}/reservations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "confirmed" }),
      })
      if (!res.ok) throw new Error("Error al confirmar")
      startTransition(() => {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "confirmed" as const } : r))
        )
      })
    } catch {
      // user can retry
    } finally {
      setUpdatingId(null)
    }
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-zinc-400 text-center py-12">
        No hay reservas para hoy.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((r, i) => (
        <div
          key={r.id}
          className="animate-fade-in-up-8 rounded-2xl bg-white border border-[#e5e5e5] px-5 py-4 flex items-center gap-4"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          {/* Time */}
          <div className="w-20 shrink-0 text-center">
            <p className="text-sm font-black text-[#0a0a0a]">
              {r.start_time.slice(0, 5)}
            </p>
            <p className="text-[10px] text-zinc-400">{r.end_time.slice(0, 5)}</p>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-[#e5e5e5] shrink-0" />

          {/* Court + user */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0a0a0a] truncate">
              {r.courts?.name ?? "Cancha"}
            </p>
            <p className="text-[11px] text-zinc-400 truncate">
              {r.profiles?.full_name ?? "Usuario"}
              {r.profiles?.phone && ` · ${r.profiles.phone}`}
            </p>
          </div>

          {/* Status */}
          <StatusBadge label={getStatusLabel(r.status)} variant={getStatusVariant(r.status)} />

          {/* Check-in button */}
          {r.status === "pending" && (
            <button
              onClick={() => handleCheckin(r.id)}
              disabled={updatingId === r.id}
              className="shrink-0 flex items-center gap-1.5 bg-[#1a56db] hover:bg-[#1648c0] text-white rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors disabled:opacity-50"
            >
              <CheckCircle className="size-3" />
              Check-in
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
