import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { User } from "lucide-react"

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["coach", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ENTRENADOR · PERFIL"
        title="Mi Perfil de Entrenador"
        description="Tu información pública como entrenador del club"
      />
      <EmptyState
        icon={User}
        title="Perfil disponible próximamente"
        description="Aquí podrás gestionar tu bio, especialidades, certificaciones y foto de perfil como entrenador."
      />
    </div>
  )
}
