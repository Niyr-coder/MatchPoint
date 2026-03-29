import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getClubCourts } from "@/lib/courts/queries"
import { CourtsManager } from "@/components/courts/CourtsManager"

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
