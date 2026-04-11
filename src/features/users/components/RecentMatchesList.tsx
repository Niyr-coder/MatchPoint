import Link from "next/link"
import { Swords, ShieldCheck } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import type { MatchResult } from "@/features/users/queries"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString("es-EC", { day: "numeric", month: "short" })
}

function ResultDot({ result }: { result: "win" | "loss" | "draw" }) {
  const styles = {
    win: "bg-green-500",
    loss: "bg-red-500",
    draw: "bg-zinc-300",
  }
  const labels = { win: "V", loss: "D", draw: "E" }
  return (
    <div
      className={`size-6 rounded-full flex items-center justify-center shrink-0 ${styles[result]}`}
    >
      <span className="text-[9px] font-black text-white">{labels[result]}</span>
    </div>
  )
}

function RatingDelta({ delta }: { delta: number }) {
  if (delta === 0) return null
  const positive = delta > 0
  return (
    <span
      className={`text-[11px] font-black tabular-nums ${positive ? "text-green-600" : "text-red-500"}`}
    >
      {positive ? "+" : ""}
      {delta.toFixed(2)}
    </span>
  )
}

function MatchRow({ match }: { match: MatchResult }) {
  const sportLabel = SPORT_LABELS[match.sport] ?? match.sport
  const modality = match.modality ? ` · ${match.modality}` : ""
  const opponentSlug = match.opponent_id

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <ResultDot result={match.result} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">
          {match.event_name}
        </p>
        <p className="text-[11px] text-zinc-400 truncate">
          {sportLabel}{modality}
        </p>
      </div>

      {match.opponent_name && (
        <div className="hidden sm:flex flex-col items-end shrink-0">
          {opponentSlug && UUID_REGEX.test(opponentSlug) ? (
            <Link
              href={`/dashboard/players/${opponentSlug}`}
              className="text-[11px] font-bold text-zinc-500 hover:text-foreground transition-colors"
            >
              vs {match.opponent_name}
            </Link>
          ) : (
            <span className="text-[11px] font-bold text-zinc-500">
              vs {match.opponent_name}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {match.score && (
          <span className="text-sm font-black text-foreground tabular-nums">
            {match.score}
          </span>
        )}
        <RatingDelta delta={match.rating_delta} />
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-1">
        <span className="text-[10px] text-zinc-400">
          {formatMatchDate(match.played_at)}
        </span>
        {match.is_official && (
          <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wide text-primary">
            <ShieldCheck className="size-2.5" />
            Oficial
          </span>
        )}
      </div>
    </div>
  )
}

interface RecentMatchesListProps {
  matches: MatchResult[]
}

export function RecentMatchesList({ matches }: RecentMatchesListProps) {
  return (
    <section>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
        Historial de partidos
      </p>

      {matches.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="Sin partidos recientes"
          description="Los partidos oficiales y de torneo aparecerán aquí."
        />
      ) : (
        <div className="rounded-2xl bg-card border border-border px-5 divide-y divide-border">
          {matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </div>
      )}
    </section>
  )
}
