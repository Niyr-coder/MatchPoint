"use client"

import type { Profile } from "@/types"
import type { PlayerStats } from "@/features/users/queries"

interface WelcomeBannerProps {
  profile: Profile
  date: string
  stats: PlayerStats
}

export function WelcomeBanner({ profile, date, stats }: WelcomeBannerProps) {
  const firstName = profile.first_name ?? "Jugador"

  const statItems = [
    { value: stats.tournamentsPlayed, label: "Partidos este mes" },
    { value: "3.5", label: "Rating DUPR", accent: true },
    { value: `#${stats.rankingScore || 42}`, label: "Ranking nacional" },
  ]

  return (
    <div className="animate-fade-in-up relative rounded-2xl overflow-hidden bg-[#0a0a0a] border border-zinc-800">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(16,185,129,0.25),transparent_55%)] pointer-events-none" />

      <div className="relative z-10 p-6 md:p-7">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 flex-wrap">
          {/* Left: greeting */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.1em] mb-3">
              <span className="w-[5px] h-[5px] rounded-full bg-current" />
              {date}
            </span>
            <h1
              className="font-black text-white leading-[0.95] tracking-[-0.03em] uppercase"
              style={{ fontSize: 44 }}
            >
              Hola, {firstName}<span className="text-primary">.</span>
            </h1>
            <p className="text-white/60 text-sm mt-2.5 max-w-[420px]">
              Tienes <b className="text-white">{stats.reservationsThisMonth} reservas</b> esta semana y <b className="text-[#34d399]">1 match abierto</b> buscando pareja.
            </p>
          </div>

          {/* Right: stats */}
          <div className="flex gap-5 shrink-0">
            {statItems.map((s) => (
              <div key={s.label}>
                <div
                  className="font-black tracking-[-0.03em] leading-none"
                  style={{
                    fontSize: 32,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "var(--font-heading)",
                    color: s.accent ? "#34d399" : "#fff",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-[10px] font-black tracking-[0.18em] uppercase text-white/50 mt-1.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
