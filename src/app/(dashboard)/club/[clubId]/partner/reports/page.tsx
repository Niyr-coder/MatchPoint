import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { FileBarChart } from "lucide-react"

export default async function PartnerReportsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["partner", "owner"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="SOCIO · REPORTES"
        title="Mis Reportes"
        description="Tu actividad y estadísticas como socio del club"
      />
      <EmptyState
        icon={FileBarChart}
        title="Reportes disponible próximamente"
        description="Aquí podrás consultar tu historial de actividad, reservas y participación en el club."
      />
    </div>
  )
}
