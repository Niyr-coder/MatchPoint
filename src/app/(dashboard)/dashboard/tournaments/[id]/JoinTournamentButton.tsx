"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"

interface JoinTournamentButtonProps {
  tournamentId: string
  alreadyJoined: boolean
}

export function JoinTournamentButton({ tournamentId, alreadyJoined }: JoinTournamentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joined, setJoined] = useState(alreadyJoined)

  async function handleJoin() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/join`, { method: "POST" })
      const data = await res.json()

      if (!data.success) {
        setError(data.error ?? "Error al inscribirse")
        return
      }

      setJoined(true)
      router.refresh()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (joined) {
    return (
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0]">
        <CheckCircle className="size-5 text-[#16a34a] shrink-0" />
        <p className="text-sm font-black text-[#16a34a]">Ya estás inscrito en este torneo</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-white text-sm font-black uppercase tracking-[0.1em] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "#1a56db" }}
      >
        {loading ? "Inscribiendo..." : "Inscribirse al Torneo"}
      </button>
    </div>
  )
}
