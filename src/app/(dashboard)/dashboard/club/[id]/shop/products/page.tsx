// src/app/(dashboard)/dashboard/club/[id]/shop/products/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubProductsView } from "@/components/dashboard/club/shop/ClubProductsView"

export default async function ClubProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <ClubProductsView clubId={clubId} />
    </div>
  )
}
