"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SINGLE_SPORT_MODE } from "@/lib/sports/config"
import type { Profile } from "@/types"
import type { PlayerStats } from "@/features/users/queries"

interface WelcomeBannerProps {
  profile: Profile
  date: string
  stats: PlayerStats
}

interface StatCircleProps {
  value: string | number
  label: string
  color: string
  bg: string
}

function StatCircle({ value, label, color, bg }: StatCircleProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="size-16 rounded-full flex flex-col items-center justify-center"
        style={{ background: bg }}
      >
        <span className="text-lg font-black leading-none" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50 text-center leading-tight max-w-[60px]">
        {label}
      </span>
    </div>
  )
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

  return (
    <div className="animate-fade-in-up relative rounded-2xl overflow-hidden p-5 md:p-6 bg-[#0a0a0a] border border-zinc-800 shadow-none">
      {/* Ambient green glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(22,163,74,0.06),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <Avatar className="size-14 shrink-0 ring-2 ring-zinc-700">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-600 text-white text-xl font-black">
            {initials || "J"}
          </AvatarFallback>
        </Avatar>

        {/* Name + date + sports */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-green-400 mb-0.5">
            Bienvenido de vuelta
          </p>
          <h1
            className="font-black text-white leading-[0.9] tracking-[-0.03em] truncate"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
          >
            Hola, {firstName}.
          </h1>
          <p className="mt-1.5 text-white/40 text-sm capitalize">{date}</p>

          {/* Sport chip — only shown when multiple sports are active */}
          {!SINGLE_SPORT_MODE && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                Pickleball
              </span>
            </div>
          )}
        </div>

        {/* Stat circles — reference design style */}
        <div className="flex items-end gap-4 shrink-0">
          <div className="transition-transform duration-200 hover:scale-105">
            <StatCircle
              value={stats.tournamentsPlayed}
              label="Torneos jugados"
              color="#16a34a"
              bg="linear-gradient(135deg, #052e16, #14532d)"
            />
          </div>
          <div className="transition-transform duration-200 hover:scale-105">
            <StatCircle
              value={stats.reservationsThisMonth}
              label="Reservas mes"
              color="#ffffff"
              bg="linear-gradient(135deg, #1a1a1a, #2a2a2a)"
            />
          </div>
          <div className="transition-transform duration-200 hover:scale-105">
            <StatCircle
              value={stats.rankingScore}
              label="Puntos ranking"
              color="#4ade80"
              bg="linear-gradient(135deg, #052e16, #14532d)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
