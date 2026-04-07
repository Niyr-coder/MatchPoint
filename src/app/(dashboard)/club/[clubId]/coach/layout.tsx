import { authorizeOrRedirect } from "@/features/auth/queries"
import { getCoachNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/layout/DashboardShell"

export default async function CoachLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })
  const navSections = getCoachNav(clubId)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="coach"
      dashboardHref={`/club/${clubId}/coach`}
      pageTitle="Mis Clases"
    >
      {children}
    </DashboardShell>
  )
}
