import { authorizeOrRedirect } from "@/features/auth/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminChatShell } from "@/components/admin/AdminChatShell"
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

export default async function AdminChatPage() {
  const ctx = await authorizeOrRedirect({ requiredRoles: ["admin"] })
  const clubs = await loadClubs()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · COMUNICACIONES"
        title="Centro de Anuncios"
        description="Envía anuncios a todos los usuarios o a un club específico, y gestiona tu chat personal"
      />
      <AdminChatShell userId={ctx.userId} clubs={clubs} />
    </div>
  )
}
