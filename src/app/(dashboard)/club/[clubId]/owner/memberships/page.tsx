import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { CreditCard } from "lucide-react"

export default async function OwnerMembershipsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="OWNER · MEMBRESÍAS"
        title="Gestión de Membresías"
        description="Planes, precios y miembros activos del club"
      />
      <EmptyState
        icon={CreditCard}
        title="Membresías disponible próximamente"
        description="Aquí podrás gestionar los planes de membresía, precios y el listado de socios activos."
      />
    </div>
  )
}
