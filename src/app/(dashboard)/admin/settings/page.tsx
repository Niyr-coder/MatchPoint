import { authorizeOrRedirect } from "@/features/auth/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminSettingsView } from "@/components/admin/AdminSettingsView"
import { createServiceClient } from "@/lib/supabase/server"
import type { PlatformSettings } from "@/app/api/admin/settings/route"

const DEFAULT_SETTINGS: PlatformSettings = {
  maintenance_mode: false,
  platform_version: "1.0.0 Beta",
  platform_region: "Ecuador",
  platform_currency: "USD",
}

async function loadSettings(): Promise<PlatformSettings> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")

    if (error || !data) return DEFAULT_SETTINGS

    const rows = data as { key: string; value: unknown }[]
    const map = rows.reduce<Record<string, unknown>>((acc, row) => {
      return { ...acc, [row.key]: row.value }
    }, {})

    return {
      maintenance_mode: Boolean(map.maintenance_mode ?? false),
      platform_version: String(map.platform_version ?? DEFAULT_SETTINGS.platform_version),
      platform_region: String(map.platform_region ?? DEFAULT_SETTINGS.platform_region),
      platform_currency: String(map.platform_currency ?? DEFAULT_SETTINGS.platform_currency),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default async function AdminSettingsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const settings = await loadSettings()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · CONFIG"
        title="Configuración del Sistema"
        description="Gestiona el estado de la plataforma, información global y accesos rápidos"
      />
      <AdminSettingsView settings={settings} />
    </div>
  )
}
