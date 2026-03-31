import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAllTournamentsAdmin } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { Trophy, Users, CalendarCheck, XCircle } from "lucide-react"

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  draft: "Borrador",
}

const STATUS_CLASSES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border border-blue-100",
  in_progress: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  completed: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  cancelled: "bg-red-50 text-red-600 border border-red-100",
  draft: "bg-amber-50 text-amber-700 border border-amber-100",
}

// ── sport badge ───────────────────────────────────────────────────────────────

const SPORT_CLASSES: Record<string, string> = {
  padel: "bg-violet-50 text-violet-700",
  tenis: "bg-yellow-50 text-yellow-700",
  futbol: "bg-emerald-50 text-emerald-700",
  pickleball: "bg-orange-50 text-orange-700",
}

function SportBadge({ sport }: { sport: string }) {
  const cls = SPORT_CLASSES[sport.toLowerCase()] ?? "bg-zinc-100 text-zinc-600"
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {sport}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status] ?? "bg-zinc-100 text-zinc-500"
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full ${cls}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default async function AdminTournamentsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const tournaments = await getAllTournamentsAdmin()

  const total = tournaments.length
  const active = tournaments.filter((t) => t.status === "open" || t.status === "in_progress").length
  const completed = tournaments.filter((t) => t.status === "completed").length
  const cancelled = tournaments.filter((t) => t.status === "cancelled").length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · TORNEOS"
        title="Torneos de la Plataforma"
        description="Supervisión de todos los torneos registrados"
        action={
          <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border bg-zinc-100 text-zinc-500 border-zinc-200">
            {total} total
          </span>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Torneos" value={total} icon={Trophy} variant="default" />
        <StatCard label="Activos" value={active} icon={Users} variant="success" />
        <StatCard label="Completados" value={completed} icon={CalendarCheck} variant="accent" />
        <StatCard label="Cancelados" value={cancelled} icon={XCircle} variant="warning" />
      </div>

      {/* Tournaments table */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
        {tournaments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-400">No hay torneos registrados</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-[#f0f0f0] bg-zinc-50">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Nombre</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Deporte</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Club</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Estado</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Participantes</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Fecha inicio</p>
            </div>

            {/* Rows */}
            <div className="flex flex-col divide-y divide-[#f0f0f0]">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 items-center hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-[#0a0a0a] leading-tight">{t.name}</p>
                    {t.entry_fee > 0 && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Inscripción: ${t.entry_fee.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div>
                    <SportBadge sport={t.sport} />
                  </div>
                  <p className="text-xs text-zinc-600 truncate">{t.club_name ?? "—"}</p>
                  <div>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm font-black text-[#0a0a0a] text-right">
                    {t.participant_count}
                    <span className="text-zinc-400 font-normal">/{t.max_participants}</span>
                  </p>
                  <p className="text-xs text-zinc-500 text-right">{formatDate(t.start_date)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
