export const dynamic = "force-dynamic"

import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getUserNav } from "@/lib/navigation/nav-configs"
import { getUserRoles } from "@/lib/auth/get-user-roles"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { AppRole } from "@/types"

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await authorizeOrRedirect()

  if (ctx.globalRole === "admin") {
    redirect("/admin")
  }

  // If user has club memberships and hasn't explicitly chosen player mode,
  // redirect to context selector so they land on their role dashboard.
  const cookieStore = await cookies()
  const playerMode = cookieStore.get("player_mode")?.value
  if (!playerMode) {
    const userRoles = await getUserRoles(ctx.userId)
    if (userRoles.length === 1) {
      redirect(`/club/${userRoles[0].clubId}/${userRoles[0].role}`)
    }
    if (userRoles.length > 1) {
      redirect("/dashboard/context-selector")
    }
  }

  const navSections = getUserNav()

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole={ctx.globalRole as AppRole}
      dashboardHref="/dashboard"
      pageTitle="Mi espacio"
    >
      {children}
    </DashboardShell>
  )
}
