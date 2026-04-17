"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"

interface RoundAdvanceBannerProps {
  tournamentId: string
  completedRound: number
  onAdvance: () => void
  onDismiss: () => void
}

export function RoundAdvanceBanner({
  tournamentId,
  completedRound,
  onAdvance,
  onDismiss,
}: RoundAdvanceBannerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdvance() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/brackets/advance-round`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_round: completedRound }),
        }
      )
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) {
        setError(json.error ?? "Error al avanzar de ronda")
        setLoading(false)
        return
      }
      setLoading(false)
      onAdvance()
    } catch {
      setError("Error de red al avanzar de ronda")
      setLoading(false)
    }
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-4">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span className="mt-1 size-2 rounded-full bg-green-500 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold text-green-800">
            Ronda {completedRound} completada — todos los partidos han terminado.
          </p>
          <p className="text-xs text-green-700">
            Puedes avanzar a la siguiente ronda cuando estés listo.
          </p>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDismiss}
          disabled={loading}
          className="text-xs font-bold text-green-700 hover:text-green-900 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          onClick={() => void handleAdvance()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading && <RefreshCw className="size-3 animate-spin" />}
          Avanzar →
        </button>
      </div>
    </div>
  )
}
