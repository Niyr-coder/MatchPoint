'use client'

import { useMatchStats } from "@/features/shared/hooks/useMatchStats"
import type { MatchStats } from "@/features/tournaments/types"

interface Props {
  tournamentId: string
}

interface RankedStats extends MatchStats {
  rank: number
}

function sortStats(stats: MatchStats[]): RankedStats[] {
  return [...stats]
    .sort((a, b) => {
      if (b.round_robin_points !== a.round_robin_points) {
        return b.round_robin_points - a.round_robin_points
      }
      if (b.wins !== a.wins) {
        return b.wins - a.wins
      }
      const diffA = a.sets_for - a.sets_against
      const diffB = b.sets_for - b.sets_against
      if (diffB !== diffA) {
        return diffB - diffA
      }
      return a.player_id.localeCompare(b.player_id)
    })
    .map((s, i) => ({ ...s, rank: i + 1 }))
}

function RankBadge({ rank }: { rank: number }) {
  const base = "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"

  if (rank === 1) return <span className={`${base} bg-amber-100 text-amber-700`}>{rank}</span>
  if (rank === 2) return <span className={`${base} bg-slate-100 text-slate-600`}>{rank}</span>
  if (rank === 3) return <span className={`${base} bg-orange-50 text-orange-700`}>{rank}</span>
  return <span className={`${base} bg-muted text-muted-foreground`}>{rank}</span>
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <tr key={i} className="animate-pulse">
          {[...Array(8)].map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div className="h-4 bg-muted rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function SkeletonCards() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
          <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
          <div className="w-8 h-8 bg-muted rounded" />
        </div>
      ))}
    </>
  )
}

export function RoundRobinStandings({ tournamentId }: Props) {
  const { stats, loading, error } = useMatchStats(tournamentId)

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {error}
      </div>
    )
  }

  const ranked = loading ? [] : sortStats(stats)

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["#", "Jugador", "PJ", "PG", "PP", "SF", "SC", "Pts"].map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : ranked.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No hay partidos registrados aún.
                </td>
              </tr>
            ) : (
              ranked.map(s => (
                <tr
                  key={s.player_id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-3 py-3">
                    <RankBadge rank={s.rank} />
                  </td>
                  <td className="px-3 py-3 font-medium text-foreground">{s.player_id}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.matches_played}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.wins}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.losses}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.sets_for}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.sets_against}</td>
                  <td className="px-3 py-3 font-bold text-emerald-600">{s.round_robin_points}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {loading ? (
          <SkeletonCards />
        ) : ranked.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay partidos registrados aún.
          </p>
        ) : (
          ranked.map(s => (
            <div
              key={s.player_id}
              className={`flex items-center gap-3 p-4 bg-card rounded-lg border border-border${
                s.rank <= 3 ? " border-l-2 border-l-emerald-500" : ""
              }`}
            >
              <RankBadge rank={s.rank} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{s.player_id}</p>
                <p className="text-xs text-muted-foreground">
                  {s.wins}V · {s.losses}D
                </p>
              </div>
              <span className="text-2xl font-black text-emerald-600">{s.round_robin_points}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
