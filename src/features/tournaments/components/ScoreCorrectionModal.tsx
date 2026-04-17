"use client"

import { useState, useEffect } from "react"
import { RefreshCw, X } from "lucide-react"

interface BracketPlayer {
  id: string
  username: string | null
  full_name: string | null
}

export interface BracketMatch {
  id: string
  round: number
  match_number: number
  score: string | null
  status: "pending" | "in_progress" | "completed" | "bye"
  player1: BracketPlayer | null
  player2: BracketPlayer | null
  winner: BracketPlayer | null
}

interface ScoreCorrectionModalProps {
  match: BracketMatch
  tournamentId: string
  isOpen: boolean
  onClose: () => void
  onCorrected: () => void
}

function playerName(p: BracketPlayer | null): string {
  return p ? (p.full_name ?? p.username ?? "Jugador") : "BYE"
}

function parseScore(score: string | null): { a: string; b: string } {
  if (!score) return { a: "", b: "" }
  const parts = score.split("-")
  return { a: parts[0] ?? "", b: parts[1] ?? "" }
}

export function ScoreCorrectionModal({
  match,
  tournamentId,
  isOpen,
  onClose,
  onCorrected,
}: ScoreCorrectionModalProps) {
  const parsed = parseScore(match.score)
  const [scoreA, setScoreA] = useState(parsed.a)
  const [scoreB, setScoreB] = useState(parsed.b)
  const [newWinnerId, setNewWinnerId] = useState(match.winner?.id ?? "")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const p = parseScore(match.score)
      setScoreA(p.a)
      setScoreB(p.b)
      setNewWinnerId(match.winner?.id ?? "")
      setReason("")
      setError(null)
    }
  }, [isOpen, match])

  const winnerChanged = match.winner?.id !== newWinnerId && newWinnerId !== ""

  async function handleSubmit() {
    if (!newWinnerId) {
      setError("Selecciona el ganador")
      return
    }
    if (reason.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const scoreValue = scoreA !== "" || scoreB !== "" ? `${scoreA}-${scoreB}` : null
      const res = await fetch(
        `/api/tournaments/${tournamentId}/brackets/${match.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            correction: true,
            new_score: scoreValue,
            new_winner_id: newWinnerId,
            reason: reason.trim(),
          }),
        }
      )
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) {
        setError(json.error ?? "Error al corregir resultado")
        setLoading(false)
        return
      }
      setLoading(false)
      onCorrected()
    } catch {
      setError("Error de red al corregir resultado")
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-foreground">
              Corregir resultado
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {playerName(match.player1)} vs {playerName(match.player2)} — Partido {match.match_number}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Current score display */}
          {match.score && (
            <div className="bg-muted rounded-lg px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1">
                Resultado actual
              </p>
              <p className="text-sm font-mono text-foreground">{match.score}</p>
              {match.winner && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ganador: <span className="font-bold text-foreground">{playerName(match.winner)}</span>
                </p>
              )}
            </div>
          )}

          {/* Score inputs */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Nuevo marcador
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground truncate">{playerName(match.player1)}</span>
                <input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm text-center outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card w-full"
                  placeholder="0"
                />
              </div>
              <span className="text-lg font-black text-muted-foreground mt-5">–</span>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground truncate text-right">{playerName(match.player2)}</span>
                <input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm text-center outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card w-full"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Winner selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Ganador
            </label>
            <div className="flex gap-2">
              {([match.player1, match.player2] as const).map((player) => {
                if (!player) return null
                const selected = newWinnerId === player.id
                const isCurrent = match.winner?.id === player.id
                return (
                  <button
                    key={player.id}
                    onClick={() => setNewWinnerId(player.id)}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-0.5 ${
                      selected
                        ? "bg-green-50 border-green-400 text-green-700"
                        : "bg-card border-border text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    <span className="truncate w-full text-center">{playerName(player)}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Ganador actual
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Warning if winner changes */}
          {winnerChanged && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-xs text-orange-800">
                Si el ganador cambia, se actualizará su avance en la ronda siguiente.
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Motivo de la corrección <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Describe el motivo de la corrección (mín. 10 caracteres)"
              className="border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={loading || !newWinnerId || reason.trim().length < 10}
              className="flex-1 bg-foreground hover:bg-foreground/90 text-white rounded-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <RefreshCw className="size-3.5 animate-spin" />}
              Confirmar corrección
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
