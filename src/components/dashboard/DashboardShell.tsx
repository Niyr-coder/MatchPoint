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
  darkMode?: boolean
  children: React.ReactNode
}

export function DashboardShell({
  navSections,
  profile,
  currentRole,
  clubName,
  darkMode = false,
  children,
}: DashboardShellProps) {
  return (
    <div className={`flex h-screen overflow-hidden relative ${darkMode ? "bg-zinc-950" : "bg-slate-100"}`}>
      {/* Subtle brand gradient (light mode only) */}
      {!darkMode && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 5% 95%, rgba(22,163,74,0.07) 0%, transparent 100%)",
          }}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        sections={navSections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      {/* Content area — flex-1 already positions after the sidebar in the flex flow */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          sections={navSections}
          profile={profile}
          currentRole={currentRole}
          clubName={clubName}
          darkMode={darkMode}
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
