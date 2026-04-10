import { authorizeOrRedirect } from "@/features/auth/queries"
import { getAllClubsAdmin } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminClubsView } from "@/components/admin/AdminClubsView"

export default async function AdminClubsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const clubs = await getAllClubsAdmin()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Gestión Global"
        title="Clubs"
        action={
          <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border bg-muted text-zinc-500 border-zinc-200">
            {clubs.length} total
          </span>
        }
      />
      <AdminClubsView clubs={clubs} />
    </div>
  )
}
