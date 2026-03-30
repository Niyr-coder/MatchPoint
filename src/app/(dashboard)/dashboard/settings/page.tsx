import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { SettingsView } from "@/components/dashboard/SettingsView"

export default async function UserSettingsPage() {
  await authorizeOrRedirect()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="CONFIGURACIÓN"
        title="Configuración"
        description="Notificaciones, privacidad y preferencias"
      />
      <SettingsView />
    </div>
  )
}
