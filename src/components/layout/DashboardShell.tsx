import { Sidebar } from "@/components/layout/Sidebar"
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

      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4">
          {children}
        </div>
      </main>
    </div>
  )
}
