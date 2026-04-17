"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface EventCardCTAProps {
  eventId: string
  isRegistered: boolean
  canRegister: boolean
  isFull: boolean
}

export function EventCardCTA({ eventId, isRegistered, canRegister, isFull }: EventCardCTAProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "POST" })
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

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex gap-2">
        {isRegistered ? (
          <Link
            href={`/dashboard/events/${eventId}`}
            className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-[#f0fdf4] text-[#15803d] border border-[#86efac]"
          >
            ✓ Ya estás inscrito
          </Link>
        ) : isFull ? (
          <span className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-muted text-zinc-400 border border-zinc-200">
            Sin lugares
          </span>
        ) : canRegister ? (
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-foreground text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Registrando…" : "Inscribirme"}
          </button>
        ) : (
          <span className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-muted text-zinc-400 border border-zinc-200">
            Registro cerrado
          </span>
        )}

        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 px-4 bg-[#fafafa] text-zinc-500 border border-[#e5e5e5] hover:bg-muted transition-colors"
        >
          Info
        </Link>
      </div>

      {error && (
        <p className="text-[10px] text-red-600 text-center font-medium">{error}</p>
      )}
    </div>
  )
}
