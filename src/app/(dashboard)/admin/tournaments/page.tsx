import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Trophy } from "lucide-react"

export default async function AdminTournamentsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · TORNEOS"
        title="Torneos de la Plataforma"
        description="Gestión y supervisión de todos los torneos activos"
      />
      <EmptyState
        icon={Trophy}
        title="Torneos disponible próximamente"
        description="Aquí podrás ver, aprobar y gestionar todos los torneos registrados en la plataforma."
      />
    </div>
  )
}
