import { Calendar, Clock, CheckCircle } from "lucide-react"
import { getClubReservations, getClubReservationsToday } from "@/features/bookings/queries"
import { getCourtsByClub } from "@/features/clubs/queries/courts"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { ClubReservationsTable } from "@/features/bookings/components/ClubReservationsTable"

interface ClubReservationsPageProps {
  clubId: string
}

/**
 * Shared server component for Owner and Manager reservations pages.
 * Both are identical — only the auth guard (role) differs.
 */
export async function ClubReservationsPage({ clubId }: ClubReservationsPageProps) {
  const [allReservations, todayReservations, courts] = await Promise.all([
    getClubReservations(clubId).catch(() => []),
    getClubReservationsToday(clubId).catch(() => []),
    getCourtsByClub(clubId).catch(() => []),
  ])

  const todayPending = todayReservations.filter((r) => r.status === "pending").length
  const todayConfirmed = todayReservations.filter((r) => r.status === "confirmed").length
  const courtOptions = courts.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader label="Gestión" title="Reservas del Club" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Hoy"
          value={todayReservations.length}
          icon={Calendar}
          variant="default"
        />
        <StatCard
          label="Pendientes"
          value={todayPending}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="Confirmadas"
          value={todayConfirmed}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      <ClubReservationsTable
        initialReservations={allReservations}
        clubId={clubId}
        courtOptions={courtOptions}
        showActions
      />
    </div>
  )
}
