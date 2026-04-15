"use client"

import { useState, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import {
  initializeMatches,
  applyKingRotation,
  determineWinner,
  hasGuest,
  teamSize,
  type ActiveMatch,
  type MatchWinner,
} from "@/features/organizer/utils/rotation"
import type { QuedadaParticipant } from "@/features/organizer/types"

const COURT_OPTIONS = [1, 2, 3, 4] as const
type CourtCount = (typeof COURT_OPTIONS)[number]

interface Props {
  quedadaId: string
  dynamic: "king_of_court" | "popcorn"
  participants: QuedadaParticipant[]
  modality: string
}

function displayName(p: QuedadaParticipant): string {
  if (p.guest_name) return `${p.guest_name} ${p.guest_lastname ?? ""}`.trim()
  return p.profiles?.full_name ?? p.profiles?.username ?? "Jugador"
}

function teamLabel(team: QuedadaParticipant[]): string {
  return team.map(displayName).join(" / ")
}

interface CourtCardProps {
  match: ActiveMatch
  onSubmit: (match: ActiveMatch, scoreA: number, scoreB: number) => Promise<void>
  submitting: boolean
}

function CourtCard({ match, onSubmit, submitting }: CourtCardProps) {
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const courtNum = match.courtIndex + 1

  return (
    <div className="border-2 border-green-300 rounded-2xl p-4 bg-green-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-wide text-green-700">
          Cancha {courtNum} — En juego
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
          <div className="text-[11px] font-black mb-1 truncate">{teamLabel(match.teamA)}</div>
          <input
            type="number"
            min={0}
            max={99}
            value={scoreA}
            onChange={e => setScoreA(Math.max(0, Number(e.target.value)))}
            className="w-14 h-11 border-2 border-green-400 rounded-xl text-center text-xl font-black bg-white focus:outline-none"
          />
        </div>
        <span className="text-[10px] font-black text-zinc-400">VS</span>
        <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
          <div className="text-[11px] font-black mb-1 truncate">{teamLabel(match.teamB)}</div>
          <input
            type="number"
            min={0}
            max={99}
            value={scoreB}
            onChange={e => setScoreB(Math.max(0, Number(e.target.value)))}
            className="w-14 h-11 border-2 border-border rounded-xl text-center text-xl font-black bg-white focus:outline-none"
          />
        </div>
      </div>
      <button
        disabled={submitting || (scoreA === 0 && scoreB === 0)}
        onClick={() => void onSubmit(match, scoreA, scoreB)}
        className="mt-3 w-full py-2.5 bg-foreground text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <RefreshCw className="size-3 animate-spin" />}
        Registrar resultado → rotar
      </button>
    </div>
  )
}

interface PopcornPickerProps {
  queue: QuedadaParticipant[]
  slotsNeeded: number
  onPick: (picked: QuedadaParticipant[]) => void
}

function PopcornPicker({ queue, slotsNeeded, onPick }: PopcornPickerProps) {
  const [selected, setSelected] = useState<QuedadaParticipant[]>([])

  function toggle(p: QuedadaParticipant) {
    setSelected(prev =>
      prev.find(x => x.id === p.id)
        ? prev.filter(x => x.id !== p.id)
        : prev.length < slotsNeeded
        ? [...prev, p]
        : prev
    )
  }

  return (
    <div className="border-2 border-blue-300 rounded-2xl p-4 bg-blue-50">
      <p className="text-[10px] font-black uppercase tracking-wide text-blue-700 mb-3">
        Popcorn — Elige {slotsNeeded} jugador{slotsNeeded > 1 ? "es" : ""} que entra{slotsNeeded > 1 ? "n" : ""}
      </p>
      <div className="flex flex-col gap-2">
        {queue.map(p => {
          const isSelected = !!selected.find(x => x.id === p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                isSelected ? "border-blue-400 bg-white" : "border-blue-200 bg-white/50 hover:border-blue-300"
              }`}
            >
              <span className="text-sm font-bold flex-1">{displayName(p)}</span>
              {isSelected && <span className="text-[10px] font-black text-blue-600">✓</span>}
            </button>
          )
        })}
      </div>
      <button
        disabled={selected.length < slotsNeeded}
        onClick={() => onPick(selected)}
        className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Confirmar selección
      </button>
    </div>
  )
}

export function RotationPanel({ quedadaId, dynamic, participants, modality }: Props) {
  const [courtCount, setCourtCount] = useState<CourtCount>(1)
  const [initialized, setInitialized] = useState(false)
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([])
  const [queue, setQueue] = useState<QuedadaParticipant[]>([])
  const [submittingCourt, setSubmittingCourt] = useState<number | null>(null)
  const [popcornPending, setPopcornPending] = useState<{
    match: ActiveMatch
    winner: MatchWinner
  } | null>(null)

  function start() {
    const { activeMatches: matches, waitingQueue } = initializeMatches(participants, courtCount, modality)
    setActiveMatches(matches)
    setQueue(waitingQueue)
    setInitialized(true)
  }

  const handleSubmit = useCallback(
    async (match: ActiveMatch, scoreA: number, scoreB: number) => {
      setSubmittingCourt(match.courtIndex)
      const winner = determineWinner(scoreA, scoreB)

      if (!hasGuest(match)) {
        const rep1 = match.teamA[0].user_id!
        const rep2 = match.teamB[0].user_id!
        try {
          await fetch(`/api/quedadas/${quedadaId}/rotation/match`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player1Id: rep1, player2Id: rep2, scoreA, scoreB }),
          })
        } catch {
          // Non-fatal
        }
      }

      if (dynamic === "popcorn" && queue.length > 0) {
        setPopcornPending({ match, winner })
        setSubmittingCourt(null)
        return
      }

      const { updatedMatch, updatedQueue } = applyKingRotation(match, winner, queue)
      setActiveMatches(prev =>
        prev.map(m => (m.courtIndex === match.courtIndex ? { ...updatedMatch, scoreA: 0, scoreB: 0 } : m))
      )
      setQueue(updatedQueue)
      setSubmittingCourt(null)
    },
    [quedadaId, dynamic, queue]
  )

  function handlePopcornPick(picked: QuedadaParticipant[]) {
    if (!popcornPending) return
    const { match, winner } = popcornPending
    const loserTeam = winner === "A" ? match.teamB : match.teamA
    const winnerTeam = winner === "A" ? match.teamA : match.teamB
    const size = teamSize(modality)

    const newQueue = queue.filter(p => !picked.find(pk => pk.id === p.id)).concat(loserTeam)

    const updatedMatch: ActiveMatch = {
      ...match,
      matchKey: match.matchKey + 1,
      teamA: winner === "A" ? winnerTeam : picked.slice(0, size),
      teamB: winner === "B" ? winnerTeam : picked.slice(0, size),
      scoreA: 0,
      scoreB: 0,
    }

    setActiveMatches(prev => prev.map(m => (m.courtIndex === match.courtIndex ? updatedMatch : m)))
    setQueue(newQueue)
    setPopcornPending(null)
  }

  const DYNAMIC_DESC: Record<string, string> = {
    king_of_court: "Ganador permanece en cancha. Perdedor rota al final de la fila.",
    popcorn: "Ganador elige quién entra a continuación.",
  }

  if (!initialized) {
    const size = teamSize(modality)
    const minPlayers = courtCount * size * 2
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
            {dynamic === "king_of_court" ? "King of the Court" : "Popcorn"}
          </p>
          <p className="text-xs text-zinc-500">{DYNAMIC_DESC[dynamic]}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">Canchas activas</span>
          <div className="flex gap-1.5">
            {COURT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setCourtCount(n)}
                className={`size-8 rounded-lg border-2 text-sm font-black transition-colors ${
                  courtCount === n
                    ? "border-foreground bg-foreground text-white"
                    : "border-border hover:border-foreground/50 text-zinc-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {participants.length < minPlayers && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700">
            Necesitas al menos {minPlayers} jugadores para {courtCount}{" "}
            {courtCount === 1 ? "cancha" : "canchas"} en {modality}. Tienes {participants.length}.
          </div>
        )}
        <button
          disabled={participants.length < minPlayers}
          onClick={start}
          className="w-full py-3 bg-foreground text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Iniciar scoreboard
        </button>
      </div>
    )
  }

  const slotsForPopcorn = popcornPending
    ? (popcornPending.winner === "A" ? popcornPending.match.teamB : popcornPending.match.teamA).length
    : 0

  return (
    <div className="flex flex-col gap-4">
      {popcornPending && queue.length > 0 && (
        <PopcornPicker queue={queue} slotsNeeded={slotsForPopcorn} onPick={handlePopcornPick} />
      )}
      {!popcornPending &&
        activeMatches.map(match => (
          <CourtCard
            key={`${match.courtIndex}-${match.matchKey}`}
            match={match}
            submitting={submittingCourt === match.courtIndex}
            onSubmit={handleSubmit}
          />
        ))}
      {queue.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-2">
            Fila de espera ({queue.length})
          </p>
          <div className="flex flex-col gap-2">
            {queue.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-black text-zinc-500 shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm font-bold flex-1 truncate">{displayName(p)}</span>
                {p.guest_name && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">
                    INVITADO
                  </span>
                )}
                {i === 0 && !popcornPending && (
                  <span className="text-[10px] text-zinc-400 font-bold">Siguiente</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setInitialized(false)}
        className="text-[11px] text-zinc-400 hover:text-zinc-600 font-bold underline self-center transition-colors"
      >
        Reiniciar scoreboard
      </button>
    </div>
  )
}
