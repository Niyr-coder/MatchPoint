"use client"

import { useMemo, useRef, useState } from "react"
import { useMatchStats } from "@/features/shared/hooks/useMatchStats"
import type { QuedadaLeaderboardEntry } from "@/features/organizer/types"
import { QuedadaShareCard } from "./QuedadaShareCard"

interface Props {
  quedadaId: string
  quedadaName: string
}

function buildInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function buildEntries(stats: ReturnType<typeof useMatchStats>["stats"]): QuedadaLeaderboardEntry[] {
  const entries: QuedadaLeaderboardEntry[] = stats.map((s) => ({
    ...s,
    player_name: s.player_id.slice(0, 8),
    is_guest: false,
    win_pct: s.matches_played > 0 ? (s.wins / s.matches_played) * 100 : 0,
  }))

  return [...entries].sort((a, b) => {
    if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.player_id.localeCompare(b.player_id)
  })
}

const PODIUM_MEDALS = ["🥇", "🥈", "🥉"] as const
const PODIUM_AVATAR_SIZES: Record<number, string> = {
  0: "w-14 h-14 text-base",
  1: "w-11 h-11 text-sm",
  2: "w-11 h-11 text-sm",
}
const PODIUM_ORDER = [1, 0, 2] as const

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  )
}

function PodiumItem({ entry, rank }: { entry: QuedadaLeaderboardEntry; rank: number }) {
  const isFirst = rank === 0
  return (
    <div className={`flex flex-col items-center gap-1 ${isFirst ? "order-2" : rank === 1 ? "order-1" : "order-3"}`}>
      <span className="text-xl">{PODIUM_MEDALS[rank]}</span>
      <div
        className={`rounded-full bg-muted flex items-center justify-center font-bold text-foreground shrink-0 ${PODIUM_AVATAR_SIZES[rank]}`}
      >
        {buildInitials(entry.player_name)}
      </div>
      <span className="text-xs font-bold text-foreground text-center leading-tight max-w-16 truncate">
        {entry.player_name}
      </span>
      <span className={`text-[11px] font-black ${isFirst ? "text-amber-600" : "text-zinc-500"}`}>
        {entry.win_pct.toFixed(0)}%
      </span>
      {isFirst && (
        <div className={`h-12 w-20 bg-amber-50 border border-amber-200 rounded-t-xl mt-1`} />
      )}
      {!isFirst && (
        <div className="h-8 w-16 bg-muted rounded-t-xl mt-1" />
      )}
    </div>
  )
}

export function QuedadaLeaderboard({ quedadaId, quedadaName }: Props) {
  const { stats, loading, error } = useMatchStats(quedadaId)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  const entries = useMemo(() => buildEntries(stats), [stats])

  const hasCompletedMatches = stats.some((s) => s.matches_played > 0)
  const mvp = entries[0] ?? null

  async function handleShare() {
    if (!shareCardRef.current) return
    setSharing(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(shareCardRef.current, {
        width: 360,
        height: 640,
        scale: 2,
        useCORS: true,
        backgroundColor: "#000000",
      })
      const link = document.createElement("a")
      link.download = "quedada-resultados.png"
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch {
      // silently fail — image generation is best-effort
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonRows />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl p-4">
        {error}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-2xl">
        <span className="text-2xl">🏆</span>
        <p className="text-sm font-bold text-zinc-400">
          Registra el primer partido para ver el leaderboard.
        </p>
      </div>
    )
  }

  const podiumEntries = entries.slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <QuedadaShareCard
        ref={shareCardRef}
        entries={entries}
        quedadaName={quedadaName}
        date={new Date().toLocaleDateString("es-EC")}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-400">
          {quedadaName} — Clasificación
        </h2>
        {entries.length > 0 && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="text-xs font-bold px-4 py-1.5 rounded-full bg-black text-white border border-zinc-800 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
          >
            {sharing ? "Generando…" : "↑ Compartir"}
          </button>
        )}
      </div>

      {/* MVP Banner */}
      {hasCompletedMatches && mvp && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-lg shrink-0">⭐</span>
          <div>
            <p className="text-sm font-black text-amber-800">
              MVP de la sesión — {mvp.player_name}
            </p>
            <p className="text-[11px] text-amber-600">
              Mayor % de victorias · {mvp.win_pct.toFixed(0)}% ({mvp.wins} de{" "}
              {mvp.matches_played} partidos)
            </p>
          </div>
        </div>
      )}

      {/* Podium */}
      {podiumEntries.length >= 1 && (
        <div className="flex items-end justify-center gap-6 py-4 bg-card border border-border rounded-2xl px-6">
          {PODIUM_ORDER.map((rank) => {
            const entry = podiumEntries[rank]
            if (!entry) return null
            return <PodiumItem key={entry.player_id} entry={entry} rank={rank} />
          })}
        </div>
      )}

      {/* Full Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400 w-8">
                #
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400">
                Jugador
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400">
                PG
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400">
                PP
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400 hidden sm:table-cell">
                Pts+
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400 hidden sm:table-cell">
                Pts-
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400 hidden md:table-cell">
                Racha
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-400">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={entry.player_id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-xs font-bold text-zinc-400">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                      {buildInitials(entry.player_name)}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate max-w-28">
                      {entry.player_name}
                    </span>
                    {entry.is_guest && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                        Guest
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-xs font-bold text-foreground">
                  {entry.wins}
                </td>
                <td className="px-3 py-3 text-center text-xs font-bold text-foreground">
                  {entry.losses}
                </td>
                <td className="px-3 py-3 text-center text-xs text-zinc-500 hidden sm:table-cell">
                  {entry.points_scored}
                </td>
                <td className="px-3 py-3 text-center text-xs text-zinc-500 hidden sm:table-cell">
                  {entry.points_conceded}
                </td>
                <td className="px-3 py-3 text-center text-xs hidden md:table-cell">
                  {entry.best_streak > 0 ? (
                    <span className="font-bold text-orange-500">🔥{entry.best_streak}</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-xs font-black ${
                      entry.win_pct >= 50 ? "text-green-600" : "text-zinc-400"
                    }`}
                  >
                    {entry.win_pct.toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
