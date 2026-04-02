import { Calendar, Clock, CheckCircle } from "lucide-react"
import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getClubReservationsToday } from "@/lib/reservations/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { TodayTimeline } from "@/components/reservations/TodayTimeline"

export default async function EmployeeReservationsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const todayReservations = await getClubReservationsToday(clubId).catch(() => [])

  const pending = todayReservations.filter((r) => r.status === "pending").length
  const confirmed = todayReservations.filter((r) => r.status === "confirmed").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Empleado · Operaciones"
        title="Reservas de Hoy"
        description="Gestiona los check-ins y el estado de las reservas del día"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Hoy"
          value={todayReservations.length}
          icon={Calendar}
          variant="default"
        />
        <StatCard
          label="Pendientes"
          value={pending}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Confirmadas"
          value={confirmed}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      <TodayTimeline initialReservations={todayReservations} clubId={clubId} />
    </div>
  )
}
