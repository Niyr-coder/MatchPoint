import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getCourtsByClub } from "@/lib/courts/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Home } from "lucide-react"
import type { Court } from "@/lib/courts/queries"

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

type SportBadgeVariant = "success" | "accent" | "info" | "warning"

const SPORT_BADGE_VARIANT: Record<string, SportBadgeVariant> = {
  futbol: "success",
  padel: "accent",
  tenis: "info",
  pickleball: "warning",
}

export default async function ManagerCourtsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  const courts = await getCourtsByClub(clubId).catch(() => [] as Court[])

  const activeCourts = courts.filter((c) => c.is_active)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader label="MANAGER · CANCHAS" title="Canchas del Club" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Canchas" value={courts.length} icon={Home} variant="default" />
        <StatCard label="Activas" value={activeCourts.length} icon={Home} variant="success" />
      </div>

      {courts.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No hay canchas registradas"
          description="El dueño del club aún no ha agregado canchas."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((court: Court) => (
            <div
              key={court.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <StatusBadge
                  label={SPORT_LABELS[court.sport] ?? court.sport}
                  variant={SPORT_BADGE_VARIANT[court.sport] ?? "neutral"}
                />
                <StatusBadge
                  label={court.is_active ? "Activa" : "Inactiva"}
                  variant={court.is_active ? "success" : "error"}
                />
              </div>

              <h3 className="text-sm font-black text-[#0a0a0a] leading-tight">
                {court.name}
              </h3>

              <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
                {court.surface_type && (
                  <span>Superficie: {court.surface_type}</span>
                )}
                <span>
                  {court.is_indoor ? "Cubierta (Indoor)" : "Descubierta (Outdoor)"}
                </span>
                <span className="font-bold text-[#0a0a0a]">
                  ${court.price_per_hour.toFixed(2)} / hora
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
