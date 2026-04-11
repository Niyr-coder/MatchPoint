import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubEventsPageContent } from "@/features/activities/components/ClubEventsPage"

export default async function ManagerEventsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  return <ClubEventsPageContent clubId={clubId} role="manager" />
}
