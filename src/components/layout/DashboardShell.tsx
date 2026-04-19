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
    <div className="flex h-screen overflow-hidden bg-[#fafafa]">
      {/* Desktop sidebar — always dark */}
      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar — visible on all screen sizes */}
        <TopBar
          sections={navSections}
          profile={profile}
          currentRole={currentRole}
          clubName={clubName}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-7 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
