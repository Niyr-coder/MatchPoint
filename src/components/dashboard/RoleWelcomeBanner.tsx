"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile, AppRole } from "@/types"

const ROLE_LABEL: Record<AppRole, string> = {
  admin:    "Administrador Global",
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

  return (
    <div className="animate-fade-in-up relative rounded-2xl overflow-hidden bg-[#0a0a0a] border border-zinc-800">
      {/* Top green accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-green-400 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(22,163,74,0.1),transparent_55%)] pointer-events-none" />

      <div className="relative z-10 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <Avatar className="size-14 shrink-0 ring-2 ring-zinc-800">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xl font-black">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Name + date + club */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
              {ROLE_LABEL[role]}
            </p>
            <h1
              className="font-black text-white uppercase leading-[0.9] tracking-[-0.03em] truncate"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
            >
              Hola, {firstName}.
            </h1>
            <p className="mt-1.5 text-white/40 text-sm capitalize">{date}</p>
            {clubName && (
              <div className="mt-2.5">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {clubName}
                </span>
              </div>
            )}
          </div>

          {/* Stats strip */}
          {stats.length > 0 && (
            <div className="flex items-center gap-0 shrink-0 rounded-xl border border-zinc-800 overflow-hidden">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`px-4 py-3 text-center ${i < stats.length - 1 ? "border-r border-zinc-800" : ""}`}
                >
                  <p className="text-xl font-black text-white leading-none tabular-nums">{s.value}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mt-0.5 max-w-[70px]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
