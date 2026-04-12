// src/app/(dashboard)/dashboard/club/[id]/shop/products/new/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ProductForm } from "@/components/dashboard/club/shop/ProductForm"

export default async function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Nuevo producto</h1>
        <p className="text-zinc-500 text-sm mt-1">El producto quedará activo de inmediato.</p>
      </div>
      <ProductForm clubId={clubId} />
    </div>
  )
}
