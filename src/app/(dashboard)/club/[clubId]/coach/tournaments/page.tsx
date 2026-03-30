import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Trophy } from "lucide-react"

export default async function CoachTournamentsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["coach", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ENTRENADOR · TORNEOS"
        title="Mis Torneos"
        description="Torneos en los que participas como entrenador"
      />
      <EmptyState
        icon={Trophy}
        title="Torneos disponible próximamente"
        description="Aquí podrás ver los torneos en los que diriges alumnos y gestionar sus inscripciones."
      />
    </div>
  )
}
