import Link from "next/link"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarUserCard } from "@/components/layout/SidebarUserCard"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { NotificationsBell } from "@/features/notifications/components/NotificationsBell"
import type { NavSection, Profile, AppRole } from "@/types"

interface SidebarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function Sidebar({ sections, profile, currentRole, clubName }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-100">
      {/* Logo + notifications header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="size-6 rounded-md bg-green-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">M</span>
          </div>
          <div className="min-w-0">
            <p className="text-slate-900 font-black text-sm tracking-[-0.03em] uppercase truncate">
              MATCHPOINT
            </p>
            {clubName && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-green-600 truncate">
                {clubName}
              </p>
            )}
          </div>
        </Link>
        <NotificationsBell />
      </div>

      {/* Navigation */}
      <SidebarNav sections={sections} />

      {/* User card */}
      <SidebarUserCard profile={profile} currentRole={currentRole} />
    </aside>
  )
}

interface MobileSidebarWrapperProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function SidebarMobileTrigger({ sections, profile, currentRole, clubName }: MobileSidebarWrapperProps) {
  return (
    <MobileSidebar
      sections={sections}
      profile={profile}
      currentRole={currentRole}
      clubName={clubName}
    />
  )
}
