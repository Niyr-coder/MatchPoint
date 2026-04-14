"use client"

import { useState, useTransition } from "react"
import { X, Loader2 } from "lucide-react"

export interface QuickBookSlot {
  courtId: string
  courtName: string
  pricePerHour: number
  date: string        // "YYYY-MM-DD"
  startTime: string   // "HH:00"
  endTime: string     // "HH:00"
}

interface QuickBookModalProps {
  slot: QuickBookSlot
  onClose: () => void
  onSuccess: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function QuickBookModal({ slot, onClose, onSuccess }: QuickBookModalProps) {
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            court_id:   slot.courtId,
            date:       slot.date,
            start_time: slot.startTime,
            end_time:   slot.endTime,
            notes:      notes.trim() || undefined,
          }),
        })

        const json = await res.json()

        if (!res.ok || !json.success) {
          setError(json.error ?? "Error al reservar. Intenta de nuevo.")
          return
        }

        onSuccess()
      } catch {
        setError("Error de conexión. Intenta de nuevo.")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl flex flex-col gap-5 p-6 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Reserva rápida
            </p>
            <h2 className="text-base font-black text-foreground mt-0.5">
              {slot.courtName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        <div className="rounded-xl bg-secondary border border-border p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-zinc-400">Fecha</span>
          <span className="font-bold text-foreground capitalize">{formatDate(slot.date)}</span>
          <span className="text-zinc-400">Horario</span>
          <span className="font-bold text-foreground">
            {slot.startTime} – {slot.endTime}
          </span>
          <span className="text-zinc-400">Precio</span>
          <span className="font-bold text-foreground">${slot.pricePerHour.toFixed(2)}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Indicaciones especiales, número de jugadores…"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-zinc-500 hover:border-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-full bg-foreground text-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isPending && <Loader2 className="size-3 animate-spin" />}
            {isPending ? "Reservando…" : "Confirmar →"}
          </button>
        </div>
      </div>
    </div>
  )
}
