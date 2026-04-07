import { authorizeOrRedirect } from "@/features/auth/queries"
import { getAllUsersAdmin, getAllClubsAdmin } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminUsersView } from "@/components/admin/AdminUsersView"

export default async function AdminUsersPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const [users, clubs] = await Promise.all([getAllUsersAdmin(), getAllClubsAdmin()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Gestión Global" title="Usuarios" />
      <AdminUsersView users={users} clubs={clubs} />
    </div>
  )
}
