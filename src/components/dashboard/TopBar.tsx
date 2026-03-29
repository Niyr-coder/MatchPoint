import { MobileSidebar } from "./MobileSidebar"
import type { NavSection, Profile, AppRole } from "@/types"

interface TopBarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  pageTitle?: string
  clubName?: string | null
}

export function TopBar({ sections, profile, currentRole, pageTitle, clubName }: TopBarProps) {
  return (
    <header className="flex items-center gap-3 h-14 px-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <MobileSidebar
        sections={sections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />
      {pageTitle && (
        <h1 className="text-xs font-black uppercase tracking-[0.15em] text-white truncate">
          {pageTitle}
        </h1>
      )}
    </header>
  )
}
