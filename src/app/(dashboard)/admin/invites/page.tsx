import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminInvitesView } from "@/components/admin/AdminInvitesView"
import type { InviteLinkAdmin } from "@/app/api/admin/invites/route"
import type { ApiResponse } from "@/types"

async function getInvites(): Promise<InviteLinkAdmin[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/admin/invites?page=1`, {
      cache: "no-store",
    })
    const json: ApiResponse<InviteLinkAdmin[]> = await res.json()
    if (!json.success || !json.data) return []
    return json.data
  } catch {
    return []
  }
}

export default async function AdminInvitesPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const invites = await getInvites()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Gestión Global"
        title="Invitaciones"
        description="Todos los invite links generados en la plataforma."
        action={
          <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border bg-teal-50 text-teal-700 border-teal-200">
            {invites.filter((i) => i.is_active).length} activos
          </span>
        }
      />
      <AdminInvitesView invites={invites} />
    </div>
  )
}
