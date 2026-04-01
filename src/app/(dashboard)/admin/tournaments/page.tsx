import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAllTournamentsAdmin } from "@/lib/admin/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminTournamentsView } from "@/components/admin/AdminTournamentsView"

export default async function AdminTournamentsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const supabase = createServiceClient()

  const [tournaments, clubsResult] = await Promise.all([
    getAllTournamentsAdmin(),
    supabase.from("clubs").select("id, name").eq("is_active", true).order("name"),
  ])

  const clubs = (clubsResult.data ?? []) as { id: string; name: string }[]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · TORNEOS"
        title="Torneos de la Plataforma"
        description="Supervisión y gestión de todos los torneos registrados"
      />

      <AdminTournamentsView tournaments={tournaments} clubs={clubs} />
    </div>
  )
}
