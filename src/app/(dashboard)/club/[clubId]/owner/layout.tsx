import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getOwnerNav } from "@/lib/navigation/nav-configs"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export default async function OwnerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })
  const navSections = getOwnerNav(clubId)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole="owner"
      pageTitle="Mi Club"
    >
      {children}
    </DashboardShell>
  )
}
