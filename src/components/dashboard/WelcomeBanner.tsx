"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SPORT_OPTIONS, PRIMARY_SPORT } from "@/lib/sports/config"
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
        className="size-16 rounded-full flex flex-col items-center justify-center shadow-sm"
        style={{ background: bg }}
      >
        <span className="text-lg font-black leading-none" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 text-center leading-tight max-w-[60px]">
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
    <div
      className="animate-fade-in-up relative rounded-3xl overflow-hidden p-6 md:p-8"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #fefce8 50%, #fff7ed 100%)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}
    >
      {/* Decorative blob top-right */}
      <div
        className="pointer-events-none absolute top-0 right-0 size-48 opacity-20"
        style={{
          background: "radial-gradient(circle, #fb923c 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 size-32 opacity-15"
        style={{
          background: "radial-gradient(circle, #16a34a 0%, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <Avatar className="size-14 shrink-0 ring-4 ring-white shadow-md">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-green-400 to-emerald-600 text-white text-xl font-black">
            {initials || "J"}
          </AvatarFallback>
        </Avatar>

        {/* Name + date + sports */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 mb-0.5">
            Bienvenido de vuelta 👋
          </p>
          <h1
            className="font-black text-zinc-900 leading-[0.9] tracking-[-0.03em] truncate"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
          >
            Hola, {firstName}.
          </h1>
          <p className="mt-1.5 text-zinc-400 text-sm capitalize">{date}</p>

          {/* Sport chips — Pickleball highlighted */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {SPORT_OPTIONS.map(({ value, label }) =>
              value === PRIMARY_SPORT ? (
                <span
                  key={value}
                  className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"
                >
                  🏓 {label}
                </span>
              ) : (
                <span
                  key={value}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/70 text-zinc-500 border border-zinc-200"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>

        {/* Stat circles — reference design style */}
        <div className="flex items-end gap-4 shrink-0">
          <StatCircle
            value={stats.tournamentsPlayed}
            label="Torneos jugados"
            color="#fb923c"
            bg="linear-gradient(135deg, #fff7ed, #fed7aa)"
          />
          <StatCircle
            value={stats.reservationsThisMonth}
            label="Reservas mes"
            color="#16a34a"
            bg="linear-gradient(135deg, #f0fdf4, #bbf7d0)"
          />
          <StatCircle
            value={stats.rankingScore}
            label="Puntos ranking"
            color="#7c3aed"
            bg="linear-gradient(135deg, #f5f3ff, #ddd6fe)"
          />
        </div>
      </div>
    </div>
  )
}
