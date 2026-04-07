"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { EventStatus } from "@/features/activities/types"

interface EventRegisterButtonProps {
  eventId: string
  isRegistered: boolean
  canRegister: boolean
  isFull: boolean
  status: EventStatus
}

export function EventRegisterButton({
  eventId,
  isRegistered,
  canRegister,
  isFull,
  status,
}: EventRegisterButtonProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setError(json.error ?? "Error al registrarse")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "DELETE",
      })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setError(json.error ?? "Error al cancelar registro")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-center">
        <p className="text-sm font-bold text-red-600">Evento cancelado</p>
      </div>
    )
  }

  if (status === "completed") {
    return (
      <div className="rounded-2xl bg-zinc-100 border border-zinc-200 px-4 py-3 text-center">
        <p className="text-sm font-bold text-zinc-500">Evento finalizado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {isRegistered ? (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full border border-red-200 text-red-600 rounded-full py-3 text-sm font-black uppercase tracking-wide hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading ? "Cancelando…" : "Cancelar registro"}
        </button>
      ) : isFull ? (
        <div className="rounded-full bg-zinc-100 border border-zinc-200 px-4 py-3 text-center">
          <p className="text-sm font-bold text-zinc-500">Sin lugares disponibles</p>
        </div>
      ) : canRegister ? (
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-[#0a0a0a] text-white rounded-full py-3 text-sm font-black uppercase tracking-wide hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Registrando…" : "Registrarse"}
        </button>
      ) : (
        <div className="rounded-full bg-zinc-100 border border-zinc-200 px-4 py-3 text-center">
          <p className="text-sm font-bold text-zinc-500">Registro cerrado</p>
        </div>
      )}

      {isRegistered && (
        <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-2.5 text-center">
          <p className="text-xs font-bold text-[#16a34a]">Estás registrado en este evento</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-center">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
