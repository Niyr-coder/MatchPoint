import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner"
import { ReservasPanel } from "@/components/dashboard/ReservasPanel"
import { CanchasMapPanel } from "@/components/dashboard/CanchasMapPanel"
import { TorneosPanel } from "@/components/dashboard/TorneosPanel"
import { PickleballRatingWidget } from "@/components/dashboard/PickleballRatingWidget"
import { getUpcomingReservations, getReservationInvites } from "@/lib/reservations/queries"
import { getCourts } from "@/lib/courts/queries"
import { getOpenTournaments } from "@/lib/tournaments/queries"
import { getPlayerStats } from "@/lib/stats/queries"
import { createClient } from "@/lib/supabase/server"
import type { PickleballProfile } from "@/types"

export default async function UserDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const userId = ctx.userId

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const supabase = await createClient()

  const [reservations, invites, courts, tournaments, stats, pickleballRes] =
    await Promise.all([
      getUpcomingReservations(userId),
      getReservationInvites(userId),
      getCourts(),
      getOpenTournaments(),
      getPlayerStats(userId),
      supabase
        .from("pickleball_profiles")
        .select("singles_rating, doubles_rating, skill_level")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

  const pickleballProfile = (pickleballRes.data ?? null) as Pick<
    PickleballProfile,
    "singles_rating" | "doubles_rating" | "skill_level"
  > | null

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner profile={ctx.profile} date={date} stats={stats} />

      <PickleballRatingWidget profile={pickleballProfile} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservasPanel reservations={reservations} inviteCount={invites.length} />
        <CanchasMapPanel courts={courts} />
      </div>

      <TorneosPanel tournaments={tournaments} />
    </div>
  )
}
