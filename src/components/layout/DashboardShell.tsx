import { Sidebar } from "@/components/layout/Sidebar"
import type { NavSection, Profile, AppRole } from "@/types"

interface DashboardShellProps {
  navSections: NavSection[]
  profile: Profile & { username?: string | null }
  currentRole: AppRole
  clubName?: string | null
  dashboardHref: string
  pageTitle?: string
  children: React.ReactNode
}

export function DashboardShell({
  navSections,
  profile,
  currentRole,
  clubName,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#fafafa]">

      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
