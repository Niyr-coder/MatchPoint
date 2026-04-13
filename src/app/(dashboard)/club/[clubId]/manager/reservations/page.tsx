import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubReservationsPage } from "@/features/bookings/components/ClubReservationsPage"

export default async function ManagerReservationsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })
  return <ClubReservationsPage clubId={clubId} />
}
