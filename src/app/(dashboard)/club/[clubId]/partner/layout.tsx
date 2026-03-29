import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getPartnerNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["partner"] })
  const navSections = getPartnerNav(clubId)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="partner"
      pageTitle="Mi Club"
    >
      {children}
    </DashboardShell>
  )
}
