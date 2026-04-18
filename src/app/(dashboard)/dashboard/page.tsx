import { authorizeOrRedirect } from "@/features/auth/queries"
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner"
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel"
import { PendingInvitesBanner } from "@/components/dashboard/PendingInvitesBanner"
import { ClubActivityFeed } from "@/components/dashboard/ClubActivityFeed"
import { ReservasPanel } from "@/features/bookings/components/ReservasPanel"
import { TorneosPanel } from "@/features/tournaments/components/TorneosPanel"
import { PickleballRatingWidget } from "@/features/users/components/PickleballRatingWidget"
import { MyBadgesSection } from "@/features/badges/components/MyBadgesSection"
import { getUpcomingReservations, getReservationInvites } from "@/features/bookings/queries"
import { getOpenTournaments } from "@/features/tournaments/queries"
import { getPlayerStats } from "@/features/users/queries"
import { getPlayerBadges } from "@/features/badges/queries"
import { getClubActivity } from "@/features/clubs/club-activity"
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

  const [reservations, invites, tournaments, stats, pickleballRes, badges, activity] =
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
      getClubActivity(userId),
    ])

  const pickleballProfile = (pickleballRes.data ?? null) as Pick<
    PickleballProfile,
    "singles_rating" | "doubles_rating" | "skill_level"
  > | null

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner profile={ctx.profile} date={date} stats={stats} />
      <PendingInvitesBanner invites={invites} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservasPanel reservations={reservations} />
        <TorneosPanel tournaments={tournaments} />
      </div>
      <ClubActivityFeed items={activity} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PickleballRatingWidget profile={pickleballProfile} />
        <MyBadgesSection badges={badges} />
        <QuickActionsPanel />
      </div>
    </div>
  )
}
