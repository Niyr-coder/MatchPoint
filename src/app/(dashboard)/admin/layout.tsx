export const dynamic = "force-dynamic"

import { authorizeOrRedirect } from "@/features/auth/queries"
import { getAdminNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/layout/DashboardShell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await authorizeOrRedirect({ requiredRoles: ["admin"] })
  const navSections = getAdminNav()

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="admin"

    >
      {children}
    </DashboardShell>
  )
}
