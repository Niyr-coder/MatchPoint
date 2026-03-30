import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserCheck } from "lucide-react"

export default async function OwnerCoachesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="OWNER · ENTRENADORES"
        title="Entrenadores del Club"
        description="Gestiona el equipo de entrenadores de tu club"
      />
      <EmptyState
        icon={UserCheck}
        title="Entrenadores disponible próximamente"
        description="Aquí podrás ver, contratar y gestionar a todos los entrenadores de tu club."
      />
    </div>
  )
}
