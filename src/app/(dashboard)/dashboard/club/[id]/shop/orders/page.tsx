// src/app/(dashboard)/dashboard/club/[id]/shop/orders/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubOrdersView } from "@/components/dashboard/club/shop/ClubOrdersView"

export default async function ClubOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <ClubOrdersView clubId={clubId} />
    </div>
  )
}
