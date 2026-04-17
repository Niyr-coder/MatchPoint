"use client"

import { useEffect, useState, useCallback } from "react"
import { Shuffle, RefreshCw, Trophy, Lock, Pencil } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { RoundAdvanceBanner } from "./RoundAdvanceBanner"
import { ScoreCorrectionModal } from "./ScoreCorrectionModal"
import type { BracketMatch } from "./ScoreCorrectionModal"

interface BracketPlayer {
  id: string
  username: string | null
  full_name: string | null
}

const ROUND_ROBIN_MODALITIES = ["Round Robin", "King of the Court", "Popcorn", "Americano"]

function playerName(p: BracketPlayer | null): string {
  return p ? (p.full_name ?? p.username ?? "Jugador") : "BYE"
}

function getCompletedRoundForBanner(
  matches: BracketMatch[],
  rounds: Record<number, BracketMatch[]>
): number | null {
  const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const totalRounds = roundNums.length
  for (const roundNum of roundNums) {
    if (roundNum === Math.max(...roundNums) && totalRounds > 1) continue
    const rMatches = rounds[roundNum] ?? []
    const allDone = rMatches.every(
      (m) => m.status === "completed" || m.status === "bye"
    )
    const hasNonBye = rMatches.some((m) => m.status !== "bye")
    if (allDone && hasNonBye) {
      const nextRound = roundNums.find((r) => r > roundNum)
      if (nextRound !== undefined) {
        const nextMatches = rounds[nextRound] ?? []
        const nextHasPending = nextMatches.some(
          (m) => m.status === "pending" || m.status === "in_progress"
        )
        if (nextHasPending) return roundNum
      }
    }
  }
  return null
}

export function BracketView({
  tournamentId,
  isCreator,
  modality,
  tournamentStatus,
  bracketLocked,
  onRefresh,
}: {
  tournamentId: string
  isCreator: boolean
  modality: string | null | undefined
  tournamentStatus: string
  bracketLocked: boolean
  onRefresh?: () => void
}) {
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Score entry sheet
  const [scoreMatch, setScoreMatch] = useState<BracketMatch | null>(null)
  const [scoreInput, setScoreInput] = useState("")
  const [winnerId, setWinnerId] = useState<string>("")
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)

  // Correction modal
  const [correctionMatch, setCorrectionMatch] = useState<BracketMatch | null>(null)

  // Round advance banner
  const [bannerRound, setBannerRound] = useState<number | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState<number | null>(null)

  const isRoundRobin = ROUND_ROBIN_MODALITIES.some(m => modality?.includes(m))
  const bracketType = isRoundRobin ? "round_robin" : "elimination"

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournamentId}/brackets`)
    if (!res.ok) { setLoading(false); return }
    const json = await res.json() as { success: boolean; data: BracketMatch[] }
    if (json.success) {
      setMatches(json.data)
    }
    setLoading(false)
  }, [tournamentId])

  useEffect(() => { void load() }, [load])

  const rounds = matches.reduce<Record<number, BracketMatch[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})

  useEffect(() => {
    if (!isCreator || isRoundRobin || matches.length === 0) return
    const completedRound = getCompletedRoundForBanner(matches, rounds)
    if (completedRound !== null && completedRound !== bannerDismissed) {
      setBannerRound(completedRound)
    } else {
      setBannerRound(null)
    }
  // rounds is derived from matches — only depend on matches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, isCreator, isRoundRobin, bannerDismissed])

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

  function openScoreSheet(m: BracketMatch) {
    setScoreMatch(m)
    setScoreInput(m.score ?? "")
    setWinnerId(m.winner?.id ?? "")
    setScoreError(null)
  }

  async function submitScore() {
    if (!scoreMatch || !winnerId) { setScoreError("Selecciona el ganador"); return }
    setScoreLoading(true)
    setScoreError(null)
    const res = await fetch(`/api/tournaments/${tournamentId}/brackets/${scoreMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner_id: winnerId, score: scoreInput || null }),
    })
    const json = await res.json() as { success: boolean; error?: string }
    setScoreLoading(false)
    if (!json.success) { setScoreError(json.error ?? "Error al guardar"); return }
    setScoreMatch(null)
    await load()
    onRefresh?.()
  }

  const canEditMatch = isCreator && tournamentStatus === "in_progress"

  if (tournamentStatus === "draft") return null

  return (
    <div className="flex flex-col gap-3">
      {/* Round advance banner */}
      {isCreator && bannerRound !== null && (
        <RoundAdvanceBanner
          tournamentId={tournamentId}
          completedRound={bannerRound}
          onAdvance={async () => {
            setBannerRound(null)
            await load()
            onRefresh?.()
          }}
          onDismiss={() => {
            setBannerDismissed(bannerRound)
            setBannerRound(null)
          }}
        />
      )}

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-center gap-2 flex-wrap">
          <Shuffle className="size-4 text-zinc-400" />
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
            {isRoundRobin ? "Fixture" : "Cuadro de juego"}
          </p>
          {modality && (
            <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-zinc-500">
              {modality}
            </span>
          )}
          {bracketLocked && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              <Lock className="size-2.5" />
              Bloqueado
            </span>
          )}
          {isCreator && !bracketLocked && (
            <button
              onClick={() => void generate()}
              disabled={generating}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50 transition-colors"
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
          /* Round Robin — flat match list */
          <div className="divide-y divide-border-subtle">
            {matches.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-5 py-3 ${canEditMatch && m.status !== "bye" && m.status !== "completed" ? "cursor-pointer hover:bg-secondary" : ""}`}
                onClick={() => { if (canEditMatch && m.status !== "bye") openScoreSheet(m) }}
              >
                <span className="text-[10px] font-black text-zinc-300 w-4 shrink-0">
                  {m.match_number}
                </span>
                <span className={`flex-1 text-sm font-bold truncate ${m.winner?.id === m.player1?.id ? "text-green-600" : "text-foreground"}`}>
                  {playerName(m.player1)}
                </span>
                <span className="text-[10px] font-black text-zinc-300 px-2">vs</span>
                <span className={`flex-1 text-sm font-bold truncate text-right ${m.winner?.id === m.player2?.id ? "text-green-600" : "text-foreground"}`}>
                  {playerName(m.player2)}
                </span>
                {m.score && (
                  <span className="text-xs font-mono text-zinc-400 ml-2 shrink-0">{m.score}</span>
                )}
                {m.winner && (
                  <Trophy className="size-3.5 text-amber-400 shrink-0" aria-label={`Ganador: ${playerName(m.winner)}`} />
                )}
                {canEditMatch && m.status !== "bye" && m.status !== "completed" && (
                  <Pencil className="size-3 text-zinc-300 shrink-0" />
                )}
                {isCreator && m.status === "completed" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCorrectionMatch(m) }}
                    className="text-[10px] font-bold px-2 py-1 rounded border border-border text-muted-foreground hover:bg-secondary transition-colors shrink-0"
                  >
                    Corregir
                  </button>
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
                        className={`w-44 rounded-xl border overflow-hidden ${m.status === "bye" ? "opacity-40" : ""} ${canEditMatch && m.status !== "bye" && m.status !== "completed" ? "cursor-pointer hover:border-foreground/40" : ""}`}
                        onClick={() => { if (canEditMatch && m.status !== "bye" && m.status !== "completed") openScoreSheet(m) }}
                      >
                        <div className={`flex items-center gap-2 px-3 py-2 border-b ${m.winner?.id === m.player1?.id ? "bg-green-50" : "bg-card"}`}>
                          {m.winner?.id === m.player1?.id && <Trophy className="size-3 text-amber-400 shrink-0" />}
                          <span className={`text-xs font-bold truncate flex-1 ${m.player1 ? "text-foreground" : "text-zinc-300"}`}>
                            {playerName(m.player1)}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 ${m.winner?.id === m.player2?.id ? "bg-green-50" : "bg-card"}`}>
                          {m.winner?.id === m.player2?.id && <Trophy className="size-3 text-amber-400 shrink-0" />}
                          <span className={`text-xs font-bold truncate flex-1 ${m.player2 ? "text-foreground" : "text-zinc-300"}`}>
                            {m.status === "bye" ? "BYE" : playerName(m.player2)}
                          </span>
                        </div>
                        {m.score && (
                          <div className="px-3 py-1 bg-secondary border-t">
                            <span className="text-[10px] font-mono text-zinc-400">{m.score}</span>
                          </div>
                        )}
                        {canEditMatch && m.status !== "bye" && m.status !== "completed" && (
                          <div className="px-3 py-1.5 bg-secondary border-t flex items-center gap-1 text-[10px] text-zinc-400">
                            <Pencil className="size-2.5" />
                            Registrar resultado
                          </div>
                        )}
                        {isCreator && m.status === "completed" && (
                          <div className="px-3 py-1.5 bg-secondary border-t">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCorrectionMatch(m) }}
                              className="text-[10px] font-bold border border-border text-muted-foreground px-2 py-0.5 rounded hover:bg-card transition-colors w-full"
                            >
                              Corregir
                            </button>
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

        {/* Score entry sheet */}
        <Sheet open={scoreMatch !== null} onOpenChange={open => { if (!open) setScoreMatch(null) }}>
          <SheetContent side="bottom" className="rounded-t-2xl max-w-md mx-auto">
            <SheetHeader className="text-left pb-4">
              <SheetTitle className="text-base font-black uppercase tracking-tight text-foreground">
                Registrar resultado
              </SheetTitle>
            </SheetHeader>
            {scoreMatch && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                    Marcador (opcional)
                  </label>
                  <input
                    type="text"
                    value={scoreInput}
                    onChange={e => setScoreInput(e.target.value)}
                    placeholder="Ej: 6-3 6-4"
                    className="border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                    Ganador
                  </label>
                  <div className="flex gap-2">
                    {[scoreMatch.player1, scoreMatch.player2].map(player => {
                      if (!player) return null
                      const selected = winnerId === player.id
                      return (
                        <button
                          key={player.id}
                          onClick={() => setWinnerId(player.id)}
                          className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                            selected
                              ? "bg-green-50 border-green-400 text-green-700"
                              : "bg-card border-border text-zinc-600 hover:border-zinc-400"
                          }`}
                        >
                          {playerName(player)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {scoreError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{scoreError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setScoreMatch(null)}
                    disabled={scoreLoading}
                    className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void submitScore()}
                    disabled={scoreLoading || !winnerId}
                    className="flex-1 bg-foreground hover:bg-foreground/90 text-white rounded-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {scoreLoading && <RefreshCw className="size-3.5 animate-spin" />}
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Score correction modal */}
      {correctionMatch && (
        <ScoreCorrectionModal
          match={correctionMatch}
          tournamentId={tournamentId}
          isOpen={correctionMatch !== null}
          onClose={() => setCorrectionMatch(null)}
          onCorrected={async () => {
            setCorrectionMatch(null)
            await load()
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
