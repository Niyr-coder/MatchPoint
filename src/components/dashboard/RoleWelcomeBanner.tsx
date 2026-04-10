"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile, AppRole } from "@/types"

const BANNER_BG: Record<AppRole, string> = {
  admin:    "#b91c1c",
  owner:    "#0a0a0a",
  partner:  "#0f766e",
  manager:  "#15803d",
  employee: "#3f3f46",
  coach:    "#92400e",
  user:     "#0a0a0a",
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin:    "Plataforma Global",
  owner:    "Dueño del Club",
  partner:  "Socio del Club",
  manager:  "Vista Operativa",
  employee: "Vista Diaria",
  coach:    "Panel del Entrenador",
  user:     "Jugador",
}

interface StatItem {
  label: string
  value: string
}

interface RoleWelcomeBannerProps {
  profile: Profile
  role: AppRole
  date: string
  stats?: StatItem[]
  clubName?: string | null
}

export function RoleWelcomeBanner({
  profile,
  role,
  date,
  stats = [],
  clubName,
}: RoleWelcomeBannerProps) {
  const firstName = profile.first_name ?? "Usuario"
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.full_name ||
    "Usuario"
  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  const accentColor = BANNER_BG[role]

  return (
    <div className="animate-fade-in-up relative rounded-2xl overflow-hidden p-6 md:p-8 bg-card border border-border shadow-none transition-all duration-200 hover:border-border/60">
      {/* Top accent stripe */}
      <div
        className="h-1.5 w-full absolute top-0 left-0 right-0"
        style={{ background: accentColor }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div style={{ outline: `2px solid ${accentColor}40`, borderRadius: "9999px" }}>
          <Avatar className="size-16 shrink-0 ring-2 ring-zinc-200">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-zinc-100 text-zinc-700 text-xl font-black">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name + date + club chip */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
            style={{ color: accentColor }}
          >
            {ROLE_LABEL[role]}
          </p>
          <h1
            className="font-black text-foreground uppercase leading-[0.9] tracking-[-0.03em] truncate"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
          >
            Hola, {firstName}.
          </h1>
          <p className="mt-1.5 text-zinc-400 text-sm capitalize">{date}</p>
          {clubName && (
            <div className="mt-3">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-foreground border border-border">
                {clubName}
              </span>
            </div>
          )}
        </div>

        {/* Mini stats */}
        {stats.length > 0 && (
          <div className="flex gap-6 shrink-0 sm:border-l sm:border-border sm:pl-6">
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-black text-foreground">{value}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
