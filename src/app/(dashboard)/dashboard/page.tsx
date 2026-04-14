import { authorizeOrRedirect } from "@/features/auth/queries"
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner"
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel"
import { ReservasPanel } from "@/features/bookings/components/ReservasPanel"
import { TorneosPanel } from "@/features/tournaments/components/TorneosPanel"
import { PickleballRatingWidget } from "@/features/users/components/PickleballRatingWidget"
import { getUpcomingReservations, getReservationInvites } from "@/features/bookings/queries"
import { getOpenTournaments } from "@/features/tournaments/queries"
import { getPlayerStats } from "@/features/users/queries"
import { getPlayerBadges } from "@/features/badges/queries"
import { MyBadgesSection } from "@/features/badges/components/MyBadgesSection"
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

  const [reservations, invites, tournaments, stats, pickleballRes, badges] =
    await Promise.all([
      getUpcomingReservations(userId),
      getReservationInvites(userId),
      getOpenTournaments(),
      getPlayerStats(userId),
      supabase
        .from("pickleball_profiles")
        .select("singles_rating, doubles_rating, skill_level")
        .eq("user_id", userId)
        .maybeSingle(),
      getPlayerBadges(userId),
    ])

  const pickleballProfile = (pickleballRes.data ?? null) as Pick<
    PickleballProfile,
    "singles_rating" | "doubles_rating" | "skill_level"
  > | null

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner profile={ctx.profile} date={date} stats={stats} />

      <PickleballRatingWidget profile={pickleballProfile} />

      <MyBadgesSection badges={badges} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservasPanel reservations={reservations} inviteCount={invites.length} />
        <QuickActionsPanel />
      </div>

      <TorneosPanel tournaments={tournaments} />
    </div>
  )
}
