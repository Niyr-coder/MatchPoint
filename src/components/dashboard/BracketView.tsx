"use client"

import { useEffect, useState, useCallback } from "react"
import { Shuffle, RefreshCw, Trophy } from "lucide-react"

interface BracketPlayer {
  id: string
  username: string | null
  full_name: string | null
}

interface BracketMatch {
  id: string
  round: number
  match_number: number
  score: string | null
  status: "pending" | "in_progress" | "completed" | "bye"
  player1: BracketPlayer | null
  player2: BracketPlayer | null
  winner: BracketPlayer | null
}

const ROUND_ROBIN_MODALITIES = ["Round Robin", "King of the Court", "Popcorn", "Americano"]

export function BracketView({
  tournamentId,
  isCreator,
  modality,
  tournamentStatus,
  onRefresh,
}: {
  tournamentId: string
  isCreator: boolean
  modality: string | null | undefined
  tournamentStatus: string
  onRefresh?: () => void
}) {
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRoundRobin = ROUND_ROBIN_MODALITIES.some(m => modality?.includes(m))
  const bracketType = isRoundRobin ? "round_robin" : "elimination"

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournamentId}/brackets`)
    if (!res.ok) { setLoading(false); return }
    const json = await res.json() as { success: boolean; data: BracketMatch[] }
    if (json.success) setMatches(json.data)
    setLoading(false)
  }, [tournamentId])

  useEffect(() => { void load() }, [load])

  async function generate() {
    setGenerating(true)
    setError(null)
    const res = await fetch(`/api/tournaments/${tournamentId}/brackets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: bracketType }),
    })
    const json = await res.json() as { success: boolean; error?: string }
    if (!json.success) { setError(json.error ?? "Error al generar sorteo"); setGenerating(false); return }
    await load()
    setGenerating(false)
    onRefresh?.()
  }

  const rounds = matches.reduce<Record<number, BracketMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})

  const playerName = (p: BracketPlayer | null) =>
    p ? (p.full_name ?? p.username ?? "Jugador") : "BYE"

  if (tournamentStatus === "draft") return null

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#f0f0f0] flex items-center gap-2">
        <Shuffle className="size-4 text-zinc-400" />
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
          {isRoundRobin ? "Fixture" : "Cuadro de juego"}
        </p>
        {modality && (
          <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
            {modality}
          </span>
        )}
        {isCreator && (
          <button
            onClick={() => void generate()}
            disabled={generating}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#1a56db] text-white hover:bg-[#1648c0] disabled:opacity-50 transition-colors"
          >
            {generating ? <RefreshCw className="size-3.5 animate-spin" /> : <Shuffle className="size-3.5" />}
            {matches.length > 0 ? "Regenerar sorteo" : "Generar sorteo"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border-b border-red-200 px-5 py-3">{error}</p>
      )}

      {loading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-zinc-400 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Cargando…
        </div>
      ) : matches.length === 0 ? (
        <div className="p-8 text-center">
          <Shuffle className="size-8 text-zinc-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-zinc-400">
            {isCreator
              ? "Genera el sorteo para definir los emparejamientos."
              : "El sorteo aún no ha sido generado."}
          </p>
        </div>
      ) : isRoundRobin ? (
        /* Round Robin / Popcorn / King — flat match list */
        <div className="divide-y divide-[#f5f5f5]">
          {matches.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-[10px] font-black text-zinc-300 w-4 shrink-0">
                {m.match_number}
              </span>
              <span className={`flex-1 text-sm font-bold truncate ${m.winner?.id === m.player1?.id ? "text-green-600" : "text-[#0a0a0a]"}`}>
                {playerName(m.player1)}
              </span>
              <span className="text-[10px] font-black text-zinc-300 px-2">vs</span>
              <span className={`flex-1 text-sm font-bold truncate text-right ${m.winner?.id === m.player2?.id ? "text-green-600" : "text-[#0a0a0a]"}`}>
                {playerName(m.player2)}
              </span>
              {m.score && (
                <span className="text-xs font-mono text-zinc-400 ml-2 shrink-0">{m.score}</span>
              )}
              {m.winner && (
                <Trophy className="size-3.5 text-amber-400 shrink-0" aria-label={`Ganador: ${playerName(m.winner)}`} />
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Elimination bracket — grouped by round */
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {Object.entries(rounds).map(([round, rMatches]) => {
              const roundNum = Number(round)
              const totalRounds = Object.keys(rounds).length
              const roundLabel =
                roundNum === totalRounds ? "Final" :
                roundNum === totalRounds - 1 ? "Semifinal" :
                roundNum === totalRounds - 2 ? "Cuartos" :
                `Ronda ${roundNum}`

              return (
                <div key={round} className="flex flex-col gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-center mb-1">
                    {roundLabel}
                  </p>
                  {rMatches.map((m) => (
                    <div
                      key={m.id}
                      className={`w-44 rounded-xl border overflow-hidden ${
                        m.status === "bye" ? "opacity-40" : ""
                      }`}
                    >
                      <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                        m.winner?.id === m.player1?.id ? "bg-green-50" : "bg-white"
                      }`}>
                        {m.winner?.id === m.player1?.id && <Trophy className="size-3 text-amber-400 shrink-0" />}
                        <span className={`text-xs font-bold truncate flex-1 ${
                          m.player1 ? "text-[#0a0a0a]" : "text-zinc-300"
                        }`}>
                          {playerName(m.player1)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 ${
                        m.winner?.id === m.player2?.id ? "bg-green-50" : "bg-white"
                      }`}>
                        {m.winner?.id === m.player2?.id && <Trophy className="size-3 text-amber-400 shrink-0" />}
                        <span className={`text-xs font-bold truncate flex-1 ${
                          m.player2 ? "text-[#0a0a0a]" : "text-zinc-300"
                        }`}>
                          {m.status === "bye" ? "BYE" : playerName(m.player2)}
                        </span>
                      </div>
                      {m.score && (
                        <div className="px-3 py-1 bg-zinc-50 border-t">
                          <span className="text-[10px] font-mono text-zinc-400">{m.score}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
