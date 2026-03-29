import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
import type { NavSection, Profile, AppRole } from "@/types"

interface DashboardShellProps {
  navSections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
  pageTitle?: string
  children: React.ReactNode
}

export function DashboardShell({
  navSections,
  profile,
  currentRole,
  clubName,
  pageTitle,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          sections={navSections}
          profile={profile}
          currentRole={currentRole}
          clubName={clubName}
          pageTitle={pageTitle}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
