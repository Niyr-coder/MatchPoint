export const dynamic = "force-dynamic"

import { authorizeOrRedirect } from "@/features/auth/queries"
import { getUserNav } from "@/lib/navigation/nav-configs"
import { getUserRoles } from "@/features/memberships/queries"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { AppRole } from "@/types"

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await authorizeOrRedirect()

  if (ctx.globalRole === "admin") {
    redirect("/admin")
  }

  const userRoles = await getUserRoles(ctx.userId)

  // If user has management roles and hasn't explicitly chosen player mode,
  // redirect to context selector so they land on their role dashboard.
  // "user" role = plain club member with no management page — excluded here
  // so they stay in the player dashboard.
  const cookieStore = await cookies()
  const playerMode = cookieStore.get("player_mode")?.value
  if (!playerMode) {
    const managementRoles = userRoles.filter((r) => r.role !== "user")
    if (managementRoles.length === 1) {
      redirect(`/club/${managementRoles[0].clubId}/${managementRoles[0].role}`)
    }
    if (managementRoles.length > 1) {
      redirect("/context-selector")
    }
  }

  const isOrganizer =
    ctx.badges.some((b) => b.badge_type === "organizador_verificado") ||
    userRoles.some((r) => ["owner", "manager", "coach"].includes(r.role))

  const navSections = getUserNav(isOrganizer)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole={ctx.globalRole as AppRole}

    >
      {children}
    </DashboardShell>
  )
}
