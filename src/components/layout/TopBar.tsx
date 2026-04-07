import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { NotificationsBell } from "@/features/notifications/components/NotificationsBell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { NavSection, Profile, AppRole } from "@/types"

interface TopBarProps {
  sections: NavSection[]
  profile: Profile
  currentRole: AppRole
  pageTitle?: string
  clubName?: string | null
  darkMode?: boolean
}

export function TopBar({ sections, profile, currentRole, clubName, darkMode = false }: TopBarProps) {
  const firstName = profile.first_name ?? profile.full_name?.split(" ")[0] ?? "Bienvenido"

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  const today = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <header className={`flex items-center gap-4 h-16 px-4 md:px-6 border-b shrink-0 relative z-10 backdrop-blur-sm ${
      darkMode
        ? "border-zinc-800 bg-zinc-950/90"
        : "border-zinc-200 bg-white/80"
    }`}>
      {/* Mobile hamburger */}
      <MobileSidebar
        sections={sections}
        profile={profile}
        currentRole={currentRole}
        clubName={clubName}
      />

      {/* Greeting */}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-black leading-tight truncate ${darkMode ? "text-white" : "text-[#0a0a0a]"}`}>
          Hola, {firstName}.
        </p>
        <p className="text-[11px] text-zinc-400 capitalize hidden sm:block">{today}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <NotificationsBell />
        <Avatar className="size-8 ml-1">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-[#0a0a0a] text-white text-xs font-black">
            {initials || "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
