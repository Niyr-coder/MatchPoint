import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Users } from "lucide-react"

export default async function EmployeeClientsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee", "manager", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="EMPLEADO · CLIENTES"
        title="Clientes del Club"
        description="Listado y atención a los clientes del club"
      />
      <EmptyState
        icon={Users}
        title="Clientes disponible próximamente"
        description="Aquí podrás buscar, registrar y atender a los clientes que visitan el club."
      />
    </div>
  )
}
