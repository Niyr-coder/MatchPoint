import { authorizeOrRedirect } from "@/features/auth/queries"
import { getClubCourts } from "@/features/clubs/queries/courts"
import { CourtsManager } from "@/features/clubs/components/CourtsManager"

export default async function OwnerCourtsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const courts = await getClubCourts(clubId)

  return <CourtsManager courts={courts} clubId={clubId} />
}
