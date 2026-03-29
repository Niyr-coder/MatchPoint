import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAllUsersAdmin } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminUsersView } from "@/components/admin/AdminUsersView"

export default async function AdminUsersPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const users = await getAllUsersAdmin()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Gestión Global" title="Usuarios" />
      <AdminUsersView users={users} />
    </div>
  )
}
