import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Settings } from "lucide-react"

export default async function AdminSettingsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · CONFIG"
        title="Configuración del Sistema"
        description="Parámetros globales y ajustes de la plataforma"
      />
      <EmptyState
        icon={Settings}
        title="Configuración disponible próximamente"
        description="Aquí podrás ajustar los parámetros globales, integraciones y configuraciones del sistema."
      />
    </div>
  )
}
