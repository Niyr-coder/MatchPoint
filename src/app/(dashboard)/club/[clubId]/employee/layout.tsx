import { authorizeOrRedirect } from "@/features/auth/queries"
import { getEmployeeNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/layout/DashboardShell"

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })
  const navSections = getEmployeeNav(clubId)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="employee"
      dashboardHref={`/club/${clubId}/employee`}
      pageTitle="Vista Diaria"
    >
      {children}
    </DashboardShell>
  )
}
