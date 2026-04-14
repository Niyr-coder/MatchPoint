import type { Club } from "@/features/clubs/types"
import type { ClubProfileCourt, ActiveTournament } from "@/features/clubs/queries/club-profile"
import { ClubProfileHero } from "./ClubProfileHero"
import { ClubCourtsSection } from "./ClubCourtsSection"
import { ClubTournamentsSection } from "./ClubTournamentsSection"
import { ClubWeekCalendar } from "./ClubWeekCalendar"
import { ClubMemberSections } from "./ClubMemberSections"

interface ClubProfileShellProps {
  club: Club
  courts: ClubProfileCourt[]
  tournaments: ActiveTournament[]
  isMember: boolean
}

export function ClubProfileShell({ club, courts, tournaments, isMember }: ClubProfileShellProps) {
  const sports = [...new Set(courts.map((c) => c.sport))]

  return (
    <div className="flex flex-col gap-8">
      <ClubProfileHero club={club} sports={sports} isMember={isMember} />
      <ClubCourtsSection courts={courts} />
      <ClubTournamentsSection tournaments={tournaments} />
      <ClubWeekCalendar clubId={club.id} />
      {isMember && <ClubMemberSections clubSlug={club.slug} clubId={club.id} />}
    </div>
  )
}
