"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile } from "@/types"
import type { PlayerStats } from "@/features/users/queries"

interface WelcomeBannerProps {
  profile: Profile
  date: string
  stats: PlayerStats
}

export function WelcomeBanner({ profile, date, stats }: WelcomeBannerProps) {
  const firstName = profile.first_name ?? "Jugador"
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.full_name ||
    "Jugador"

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("")

  const statItems = [
    { value: stats.tournamentsPlayed, label: "Torneos" },
    { value: stats.reservationsThisMonth, label: "Reservas" },
    { value: stats.rankingScore, label: "Puntos" },
  ]

  return (
    <div className="animate-fade-in-up relative rounded-2xl overflow-hidden bg-[#0a0a0a] border border-zinc-800">
      {/* Top green accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-green-400 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(22,163,74,0.12),transparent_55%)] pointer-events-none" />

      <div className="relative z-10 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <Avatar className="size-14 shrink-0 ring-2 ring-zinc-700">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-700 text-white text-xl font-black">
              {initials || "J"}
            </AvatarFallback>
          </Avatar>

          {/* Name + date */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-0.5">
              Bienvenido de vuelta
            </p>
            <h1
              className="font-black text-white leading-[0.9] tracking-[-0.03em] truncate"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
            >
              Hola, {firstName}.
            </h1>
            <p className="mt-1.5 text-white/40 text-sm capitalize">{date}</p>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-0 shrink-0 rounded-xl border border-zinc-800 overflow-hidden">
            {statItems.map((s, i) => (
              <div
                key={s.label}
                className={`px-4 py-3 text-center ${i < statItems.length - 1 ? "border-r border-zinc-800" : ""}`}
              >
                <p className="text-xl font-black text-white leading-none tabular-nums">{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
