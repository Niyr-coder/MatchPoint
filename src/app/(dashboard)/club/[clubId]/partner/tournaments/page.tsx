import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Trophy, Users, CheckCircle } from "lucide-react"

interface Tournament {
  id: string
  name: string
  sport: string
  start_date: string | null
  status: string
  participant_count: number
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Próximo",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
}

type StatusVariant = "info" | "accent" | "success" | "error" | "neutral"

const STATUS_VARIANT: Record<string, StatusVariant> = {
  upcoming: "info",
  in_progress: "accent",
  completed: "success",
  cancelled: "error",
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

export default async function PartnerTournamentsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["partner", "owner"] })

  const supabase = await createServiceClient()

  const { data: rawTournaments } = await supabase
    .from("tournaments")
    .select(`
      id,
      name,
      sport,
      start_date,
      status,
      tournament_participants ( count )
    `)
    .eq("club_id", clubId)
    .order("start_date", { ascending: false })

  const tournaments: Tournament[] = (rawTournaments ?? []).map((t: {
    id: string
    name: string
    sport: string
    start_date: string | null
    status: string
    tournament_participants: { count: number }[]
  }) => ({
    id: t.id,
    name: t.name,
    sport: t.sport,
    start_date: t.start_date,
    status: t.status ?? "upcoming",
    participant_count: t.tournament_participants?.[0]?.count ?? 0,
  }))

  const total = tournaments.length
  const active = tournaments.filter((t) => t.status === "in_progress").length
  const completed = tournaments.filter((t) => t.status === "completed").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="SOCIO · TORNEOS"
        title="Torneos del Club"
        description="Torneos organizados por el club"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Torneos" value={total} icon={Trophy} variant="default" />
        <StatCard label="En Curso" value={active} icon={Trophy} variant="accent" />
        <StatCard label="Completados" value={completed} icon={CheckCircle} variant="success" />
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sin torneos disponibles"
          description="Aún no se han creado torneos para este club."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black text-[#0a0a0a]">{t.name}</p>
                <p className="text-[11px] text-zinc-500">
                  {SPORT_LABELS[t.sport] ?? t.sport}
                  {t.start_date && (
                    <> · {new Date(t.start_date).toLocaleDateString("es-EC", { dateStyle: "medium" })}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <Users className="size-3" />
                  {t.participant_count} participantes
                </span>
                <StatusBadge
                  label={STATUS_LABEL[t.status] ?? t.status}
                  variant={STATUS_VARIANT[t.status] ?? "neutral"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
