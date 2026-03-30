import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { DollarSign } from "lucide-react"

export default async function AdminFinancialsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · FINANCIERO"
        title="Financiero Global"
        description="Resumen financiero de toda la plataforma"
      />
      <EmptyState
        icon={DollarSign}
        title="Financiero disponible próximamente"
        description="Aquí podrás consultar los ingresos, comisiones y movimientos financieros globales de la plataforma."
      />
    </div>
  )
}
