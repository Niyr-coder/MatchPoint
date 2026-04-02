import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"
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
    <div className="flex h-screen bg-[#f4f4f5] overflow-hidden relative">
      {/* Subtle brand gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 5% 95%, rgba(22,163,74,0.07) 0%, transparent 100%)",
        }}
      />

      {/* Sidebar */}
      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      {/* Content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:pl-64">
        <TopBar
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
    </div>
  )
}
