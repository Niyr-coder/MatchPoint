import { Medal } from "lucide-react"
import { BADGE_CONFIG } from "@/features/badges/constants"
import type { PlayerBadge } from "@/features/badges/types"

interface MyBadgesSectionProps {
  badges: PlayerBadge[]
}

export function MyBadgesSection({ badges }: MyBadgesSectionProps) {
  if (badges.length === 0) return null

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Medal className="size-4 text-zinc-400" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Mis Insignias</p>
      </div>
      <div className="flex flex-col gap-3">
        {badges.map((badge) => {
          const cfg = BADGE_CONFIG[badge.badge_type]
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg.color}`}
            >
              <span className="text-2xl shrink-0">{cfg.emoji}</span>
              <div className="min-w-0">
                <p className="text-[12px] font-black">{cfg.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {badge.club_id ? (badge.club_name ?? "Club") : "Plataforma global"}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
