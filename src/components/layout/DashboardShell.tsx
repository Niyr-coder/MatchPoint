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
    <div className="flex h-screen overflow-hidden relative bg-[#f8f9fb]">
      {/* Warm subtle gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 0% 100%, rgba(234,179,8,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(249,115,22,0.05) 0%, transparent 60%)",
        }}
      />

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
