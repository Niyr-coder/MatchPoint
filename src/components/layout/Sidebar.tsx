import Link from "next/link"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarUserCard } from "@/components/layout/SidebarUserCard"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import type { NavSection, Profile, AppRole } from "@/types"

interface SidebarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function Sidebar({ sections, profile, currentRole, clubName }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#09090b] text-white border-r border-[#27272a] sticky top-0 h-screen">
      {/* Logo header */}
      <div className="px-5 py-[18px] flex items-center gap-1.5 border-b border-[#27272a] shrink-0">
        <span className="text-primary text-xl">●</span>
        <span className="font-black text-lg tracking-[-0.02em] text-white">MATCHPOINT</span>
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
