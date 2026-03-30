import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Trophy } from "lucide-react"

export default async function OwnerTournamentsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="OWNER · TORNEOS"
        title="Torneos del Club"
        description="Organiza y gestiona los torneos de tu club"
      />
      <EmptyState
        icon={Trophy}
        title="Torneos disponible próximamente"
        description="Aquí podrás crear, configurar y gestionar todos los torneos organizados por tu club."
      />
    </div>
  )
}
