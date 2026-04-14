import Link from "next/link"
import { Trophy } from "lucide-react"
import type { ActiveTournament } from "@/features/clubs/queries/club-profile"
import { SPORT_LABELS } from "@/lib/sports/config"

interface ClubTournamentsSectionProps {
  tournaments: ActiveTournament[]
}

const STATUS_LABEL: Record<string, string> = { open: "Abierto", in_progress: "En curso" }
const STATUS_CLASS: Record<string, string> = {
  open: "bg-green-50 text-green-700 border-green-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
}

export function ClubTournamentsSection({ tournaments }: ClubTournamentsSectionProps) {
  if (tournaments.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Torneos activos</h2>
        <p className="text-xs text-zinc-400">No hay torneos activos en este momento.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Torneos activos</h2>
      <div className="flex flex-col gap-2">
        {tournaments.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="size-4 text-zinc-400 shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-foreground truncate">{t.name}</span>
                <span className="text-[11px] text-zinc-500">
                  {SPORT_LABELS[t.sport as keyof typeof SPORT_LABELS] ?? t.sport}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_CLASS[t.status] ?? "bg-muted text-foreground border-border"}`}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
              <Link href={`/dashboard/tournaments/${t.id}`} className="text-[11px] font-black uppercase tracking-wide text-foreground underline underline-offset-2 hover:text-zinc-500 transition-colors">
                Ver
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
