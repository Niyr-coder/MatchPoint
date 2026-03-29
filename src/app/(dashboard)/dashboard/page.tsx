import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner"
import { ReservasPanel } from "@/components/dashboard/ReservasPanel"
import { CanchasMapPanel } from "@/components/dashboard/CanchasMapPanel"
import { TorneosPanel } from "@/components/dashboard/TorneosPanel"
import { getUpcomingReservations, getReservationInvites } from "@/lib/reservations/queries"
import { getCourts } from "@/lib/courts/queries"
import { getOpenTournaments } from "@/lib/tournaments/queries"
import { getPlayerStats } from "@/lib/stats/queries"

export default async function UserDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const userId = ctx.userId

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const [reservations, invites, courts, tournaments, stats] = await Promise.all([
    getUpcomingReservations(userId),
    getReservationInvites(userId),
    getCourts(),
    getOpenTournaments(),
    getPlayerStats(userId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner profile={ctx.profile} date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservasPanel reservations={reservations} inviteCount={invites.length} />
        <CanchasMapPanel courts={courts} />
      </div>

      <TorneosPanel tournaments={tournaments} />
    </div>
  )
}
