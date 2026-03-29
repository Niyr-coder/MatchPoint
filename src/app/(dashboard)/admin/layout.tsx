import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAdminNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await authorizeOrRedirect({ requiredRoles: ["admin"] })
  const navSections = getAdminNav()

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="admin"
      pageTitle="Admin"
    >
      {children}
    </DashboardShell>
  )
}
