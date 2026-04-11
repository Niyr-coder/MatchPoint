import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubEventsPageContent } from "@/features/activities/components/ClubEventsPage"

export default async function OwnerEventsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  return <ClubEventsPageContent clubId={clubId} role="owner" />
}
