import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserCheck } from "lucide-react"

export default async function EmployeeCoachesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee", "manager", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="EMPLEADO · ENTRENADORES"
        title="Entrenadores"
        description="Consulta la disponibilidad de los entrenadores"
      />
      <EmptyState
        icon={UserCheck}
        title="Entrenadores disponible próximamente"
        description="Aquí podrás consultar los horarios y disponibilidad de los entrenadores para asignar clases."
      />
    </div>
  )
}
