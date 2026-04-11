import Link from "next/link"
import { Trophy, ChevronRight, Calendar, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActiveTournament } from "@/lib/admin/queries"

const SPORT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  padel:      { bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-500" },
  tennis:     { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  futbol:     { bg: "bg-emerald-50",text: "text-emerald-700",dot: "bg-emerald-500" },
  pickleball: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: "Inscripciones", bg: "bg-emerald-50", text: "text-emerald-700" },
  in_progress: { label: "En curso",      bg: "bg-sky-50",     text: "text-sky-700" },
}

function enrollmentColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 40) return "bg-amber-500"
  return "bg-red-400"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", { day: "numeric", month: "short" })
}

interface TournamentRowProps {
  t: ActiveTournament
}

function TournamentRow({ t }: TournamentRowProps) {
  const sport = SPORT_COLORS[t.sport] ?? { bg: "bg-zinc-50", text: "text-zinc-600", dot: "bg-zinc-400" }
  const status = STATUS_LABELS[t.status] ?? { label: t.status, bg: "bg-zinc-50", text: "text-zinc-600" }
  const fillPct = t.capacity > 0 ? Math.min(100, Math.round((t.enrolled / t.capacity) * 100)) : 0

  return (
    <Link
      href={`/admin/tournaments`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      {/* Sport dot */}
      <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", sport.bg)}>
        <Trophy className={cn("size-3.5", sport.text)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[11px] font-black text-zinc-800 truncate group-hover:text-zinc-900">
            {t.name}
          </p>
          <span className={cn("text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0", status.bg, status.text)}>
            {status.label}
          </span>
        </div>
        {t.clubName && (
          <p className="text-[10px] text-zinc-400 truncate">{t.clubName}</p>
        )}
        {/* Enrollment bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", enrollmentColor(fillPct))}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-[9px] font-black text-zinc-400 shrink-0 tabular-nums">
            {t.enrolled}/{t.capacity > 0 ? t.capacity : "∞"}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 text-[9px] text-zinc-400">
          <Calendar className="size-2.5" />
          {formatDate(t.startDate)}
        </div>
        {t.capacity > 0 && (
          <p className={cn(
            "text-[9px] font-black mt-0.5",
            fillPct >= 75 ? "text-emerald-600" : fillPct >= 40 ? "text-amber-600" : "text-red-500"
          )}>
            {fillPct}%
          </p>
        )}
      </div>
    </Link>
  )
}

interface Props {
  tournaments: ActiveTournament[]
}

export function ControlTowerTournamentPipeline({ tournaments }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="size-3 text-amber-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Pipeline de torneos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tournaments.length > 0 && (
            <span className="text-[10px] font-black text-zinc-400">
              {tournaments.length} activos
            </span>
          )}
          <Link
            href="/admin/tournaments"
            className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 transition-colors"
          >
            Ver todos <ChevronRight className="size-2.5" />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 px-4">
            <Users className="size-5 text-zinc-300" />
            <p className="text-xs font-black text-zinc-400 uppercase tracking-wide">Sin torneos activos</p>
            <p className="text-[10px] text-zinc-400 text-center">
              No hay torneos abiertos o en curso ahora mismo.
            </p>
          </div>
        ) : (
          tournaments.map((t) => <TournamentRow key={t.id} t={t} />)
        )}
      </div>

      {/* Legend */}
      {tournaments.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Inscripción:</p>
          <div className="flex items-center gap-2">
            {[
              { color: "bg-emerald-500", label: "≥75%" },
              { color: "bg-amber-500",   label: "40-74%" },
              { color: "bg-red-400",     label: "<40%" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={cn("size-1.5 rounded-full", color)} />
                <span className="text-[9px] text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
