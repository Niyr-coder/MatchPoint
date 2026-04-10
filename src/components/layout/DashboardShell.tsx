import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import type { NavSection, Profile, AppRole } from "@/types"

interface DashboardShellProps {
  navSections: NavSection[]
  profile: Profile & { username?: string | null }
  currentRole: AppRole
  clubName?: string | null
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
    <div className="flex h-screen overflow-hidden bg-muted">
      {/* Desktop sidebar */}
      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      {/* Mobile + main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar — hidden on desktop */}
        <div className="lg:hidden shrink-0">
          <TopBar
            sections={navSections}
            profile={profile}
            currentRole={currentRole}
            clubName={clubName}
          />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
