import { authorizeOrRedirect } from "@/features/auth/queries"
import { getManagerNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/layout/DashboardShell"

export default async function ManagerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })
  const navSections = getManagerNav(clubId)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="manager"

    >
      {children}
    </DashboardShell>
  )
}
