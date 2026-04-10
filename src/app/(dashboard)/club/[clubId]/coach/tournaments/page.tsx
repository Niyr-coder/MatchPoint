import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Trophy } from "lucide-react"

interface TournamentRow {
  id: string
  name: string
  sport: string
  start_date: string | null
  status: string
  my_status: string
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const STATUS_VARIANT: Record<string, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  upcoming: "info",
  finished: "neutral",
  draft: "warning",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  upcoming: "Próximo",
  finished: "Finalizado",
  draft: "Borrador",
}

const PARTICIPANT_STATUS_VARIANT: Record<string, "success" | "info" | "warning" | "neutral"> = {
  confirmed: "success",
  registered: "info",
  pending: "warning",
  eliminated: "neutral",
}

const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  registered: "Inscrito",
  pending: "Pendiente",
  eliminated: "Eliminado",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

async function getCoachTournaments(
  coachUserId: string,
  clubId: string
): Promise<TournamentRow[]> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from("tournament_participants")
      .select(`
        status,
        tournaments!inner (
          id,
          name,
          sport,
          start_date,
          status,
          club_id
        )
      `)
      .eq("user_id", coachUserId)
      .eq("tournaments.club_id", clubId)
      .order("created_at", { ascending: false })

    if (error || !data) return []

    type RawRow = {
      status: string
      tournaments: {
        id: string
        name: string
        sport: string
        start_date: string | null
        status: string
      }
    }

    return (data as unknown as RawRow[]).map((row) => ({
      id: row.tournaments.id,
      name: row.tournaments.name,
      sport: row.tournaments.sport,
      start_date: row.tournaments.start_date,
      status: row.tournaments.status,
      my_status: row.status,
    }))
  } catch {
    return []
  }
}

export default async function CoachTournamentsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  const tournaments = await getCoachTournaments(ctx.userId, clubId)

  const activeTournaments = tournaments.filter((t) => t.status === "active").length
  const confirmedEntries = tournaments.filter((t) => t.my_status === "confirmed").length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Entrenador · Torneos" title="Mis Torneos" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total" value={tournaments.length} icon={Trophy} variant="default" />
        <StatCard label="Activos" value={activeTournaments} icon={Trophy} variant="success" />
        <StatCard label="Confirmados" value={confirmedEntries} icon={Trophy} variant="accent" />
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin torneos registrados"
          description="Aún no estás inscrito en ningún torneo de este club."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-4 flex items-center justify-between gap-4 hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <Trophy className="size-4 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#0a0a0a] truncate">{t.name}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {SPORT_LABELS[t.sport] ?? t.sport} · {formatDate(t.start_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge
                  label={STATUS_LABELS[t.status] ?? t.status}
                  variant={STATUS_VARIANT[t.status] ?? "neutral"}
                />
                <StatusBadge
                  label={PARTICIPANT_STATUS_LABELS[t.my_status] ?? t.my_status}
                  variant={PARTICIPANT_STATUS_VARIANT[t.my_status] ?? "neutral"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
