// src/app/(dashboard)/dashboard/club/[id]/shop/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import Link from "next/link"

export default async function ClubShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tienda del club</h1>
        <p className="text-zinc-500 text-sm mt-1">Gestiona productos y órdenes de tu club.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          href={`/dashboard/club/${clubId}/shop/products`}
          className="border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 transition-colors group"
        >
          <div className="text-2xl mb-2">📦</div>
          <h2 className="font-semibold text-zinc-900 group-hover:text-zinc-700">Productos</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Crear, editar y archivar productos</p>
        </Link>

        <Link
          href={`/dashboard/club/${clubId}/shop/orders`}
          className="border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 transition-colors group"
        >
          <div className="text-2xl mb-2">🧾</div>
          <h2 className="font-semibold text-zinc-900 group-hover:text-zinc-700">Órdenes</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Revisar comprobantes y confirmar pedidos</p>
        </Link>
      </div>
    </div>
  )
}
