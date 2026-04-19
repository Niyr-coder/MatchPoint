import Link from "next/link"
import type { PickleballProfile } from "@/types"

type PickleballRatingProfile = Pick<
  PickleballProfile,
  "singles_rating" | "doubles_rating" | "skill_level"
>

interface PickleballRatingWidgetProps {
  profile: PickleballRatingProfile | null
}

const SKILL_LABEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  pro: "Pro",
}

/** Simple sparkline SVG */
function Sparkline() {
  const pts = [3.1, 3.15, 3.2, 3.18, 3.3, 3.35, 3.5]
  const max = Math.max(...pts)
  const min = Math.min(...pts)
  const W = 200
  const H = 40
  const d = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * W},${H - ((v - min) / (max - min)) * H}`)
    .join(" ")

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48, marginTop: 14 }}>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PickleballRatingWidget({ profile }: PickleballRatingWidgetProps) {
  const rating = profile?.doubles_rating ?? profile?.singles_rating ?? null
  const skillKey = profile?.skill_level ?? "beginner"
  const skillLabel = profile?.skill_level ? SKILL_LABEL[profile.skill_level] : null
  const display = rating != null ? rating.toFixed(2) : "—"
  const diff = rating != null ? "+0.22" : null

  if (profile === null) {
    return (
      <div className="animate-fade-in-up rounded-2xl bg-card border border-border p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Rating DUPR
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Completa tu perfil para obtener tu rating
        </p>
        <Link
          href="/dashboard/account"
          className="btn-pill-green px-4 py-2 text-[11px] mt-4 inline-block"
        >
          Completar perfil
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up rounded-2xl bg-card border border-border p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Rating DUPR
      </p>
      <div className="flex items-baseline gap-2 mt-2.5">
        <span
          className="font-black tracking-[-0.03em] leading-none"
          style={{ fontSize: 40, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-heading)" }}
        >
          {display}
        </span>
        {diff && (
          <span className="text-primary text-xs font-bold">↑ {diff}</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {skillLabel ?? "—"} · Últimos 30 días
      </p>
      <Sparkline />
    </div>
  )
}
