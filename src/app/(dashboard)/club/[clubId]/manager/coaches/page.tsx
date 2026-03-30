import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserCheck } from "lucide-react"

export default async function ManagerCoachesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="MANAGER · ENTRENADORES"
        title="Entrenadores"
        description="Supervisión de los entrenadores del club"
      />
      <EmptyState
        icon={UserCheck}
        title="Entrenadores disponible próximamente"
        description="Aquí podrás ver los horarios, asignaciones y disponibilidad de los entrenadores del club."
      />
    </div>
  )
}
