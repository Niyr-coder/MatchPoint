export const dynamic = "force-dynamic"

import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getUserNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { redirect } from "next/navigation"

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await authorizeOrRedirect()

  if (ctx.globalRole === "admin") {
    redirect("/admin")
  }

  const navSections = getUserNav()

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="user"
      dashboardHref="/dashboard"
      pageTitle="Mi espacio"
    >
      {children}
    </DashboardShell>
  )
}
