import { notFound } from "next/navigation"
import { authorizeOrRedirect } from "@/features/auth/queries"
import {
  getClubBySlug,
  getClubCourts,
  getClubActiveTournaments,
  isClubMember,
} from "@/features/clubs/queries/club-profile"
import { ClubProfileShell } from "@/features/clubs/components/ClubProfileShell"

interface ClubProfilePageProps {
  params: Promise<{ slug: string }>
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { slug } = await params
  const ctx = await authorizeOrRedirect()

  // Load club first (need its ID for subsequent queries)
  const club = await getClubBySlug(slug)
  if (!club) notFound()

  // Load courts, tournaments, and membership in parallel
  const [courts, tournaments, isMember] = await Promise.all([
    getClubCourts(club.id),
    getClubActiveTournaments(club.id),
    isClubMember(ctx.userId, club.id),
  ])

  return (
    <ClubProfileShell
      club={club}
      courts={courts}
      tournaments={tournaments}
      isMember={isMember}
    />
  )
}
