import Link from "next/link"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarUserCard } from "@/components/layout/SidebarUserCard"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { NotificationsBell } from "@/features/notifications/components/NotificationsBell"
import type { NavSection, Profile, AppRole } from "@/types"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  owner: "Owner",
  manager: "Manager",
  partner: "Socio",
  coach: "Entrenador",
  employee: "Empleado",
  user: "Jugador",
}

interface SidebarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  clubName?: string | null
}

export function Sidebar({ sections, profile, currentRole, clubName }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-card border-r border-border">
      {/* Logo header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">M</span>
          </div>
          <div className="min-w-0">
            <p className="text-foreground font-black text-[13px] tracking-[-0.02em] uppercase leading-none">
              MATCHPOINT
            </p>
            {clubName ? (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary truncate mt-0.5">
                {clubName}
              </p>
            ) : (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                {ROLE_LABELS[currentRole] ?? currentRole}
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
