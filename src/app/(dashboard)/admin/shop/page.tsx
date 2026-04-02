import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminShopView } from "@/components/admin/AdminShopView"
import { createServiceClient } from "@/lib/supabase/server"

interface Club {
  id: string
  name: string
}

async function loadClubs(): Promise<Club[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error || !data) return []
    return data as Club[]
  } catch {
    return []
  }
}

export default async function AdminShopPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const clubs = await loadClubs()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · TIENDA"
        title="Panel de Shop"
        description="Supervisa órdenes y productos de todos los clubs en la plataforma"
      />
      <AdminShopView clubs={clubs} />
    </div>
  )
}
