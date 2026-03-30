import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Shield } from "lucide-react"

export default async function AdminModerationPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · MODERACIÓN"
        title="Moderación de Contenido"
        description="Revisión y control de contenido generado por usuarios"
      />
      <EmptyState
        icon={Shield}
        title="Moderación disponible próximamente"
        description="Aquí podrás revisar reportes, gestionar infracciones y mantener la calidad del contenido en la plataforma."
      />
    </div>
  )
}
