import { Search, Plus, Bell } from "lucide-react"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { NotificationsBell } from "@/features/notifications/components/NotificationsBell"
import type { NavSection, Profile, AppRole } from "@/types"

interface TopBarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  pageTitle?: string
  clubName?: string | null
}

export function TopBar({ sections, profile, currentRole, clubName }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 h-[60px] px-4 md:px-7 border-b border-border bg-white sticky top-0 z-10">
      {/* Mobile hamburger */}
      <div className="lg:hidden">
        <MobileSidebar
          sections={sections}
          profile={profile}
          currentRole={currentRole}
          clubName={clubName}
        />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2.5 flex-1 max-w-[420px]">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar jugadores, canchas, torneos…"
            className="w-full py-[9px] pl-8 pr-3 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/dashboard/reservations/new"
          className="btn-pill-green px-4 py-2 text-[12px] hidden sm:inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Reservar
        </a>
        <NotificationsBell />
      </div>
    </header>
  )
}
