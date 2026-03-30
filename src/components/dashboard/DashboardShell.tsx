import { TopNav } from "./TopNav"
import type { NavSection, Profile, AppRole } from "@/types"

interface DashboardShellProps {
  navSections: NavSection[]
  profile: Profile & { username?: string | null }
  currentRole: AppRole
  clubName?: string | null
  dashboardHref: string
  /** @deprecated — page titles are now in-page headings */
  pageTitle?: string
  children: React.ReactNode
}

export function DashboardShell({
  navSections,
  profile,
  currentRole,
  clubName,
  dashboardHref,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <TopNav
        navSections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
        dashboardHref={dashboardHref}
      />
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  )
}
