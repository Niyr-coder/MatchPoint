import { Trophy } from "lucide-react"
import type { TournamentExtras } from "@/features/tournaments/types"

const PLACE_ICON: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" }

interface Props {
  extras: TournamentExtras
}

export function TournamentPrizesSection({ extras }: Props) {
  const premios = extras.premios
  if (!premios?.enabled) return null

  const items = premios.items ?? []
  const hasItems = items.length > 0
  const hasDetail = !!premios.detail

  if (!hasItems && !hasDetail) return null

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Premios</p>
      </div>

      {hasItems ? (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border"
            >
              <span className="text-xl leading-none">{PLACE_ICON[i] ?? "🏅"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-foreground">{item.place}</p>
                <p className="text-[11px] text-zinc-500 truncate">{item.prize}</p>
              </div>
            </div>
          ))}
        </div>
      ) : hasDetail ? (
        <p className="text-sm text-zinc-600">{premios.detail}</p>
      ) : null}
    </div>
  )
}
