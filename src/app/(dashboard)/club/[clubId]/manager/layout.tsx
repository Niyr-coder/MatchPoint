import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getManagerNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

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
      dashboardHref={`/club/${clubId}/manager`}
      pageTitle="Operaciones"
    >
      {children}
    </DashboardShell>
  )
}
