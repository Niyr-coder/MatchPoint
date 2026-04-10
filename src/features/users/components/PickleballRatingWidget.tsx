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

const SKILL_COLOR: Record<string, { from: string; to: string; text: string }> = {
  beginner:     { from: "#86efac", to: "#22c55e", text: "#16a34a" },
  intermediate: { from: "#fde68a", to: "#f59e0b", text: "#d97706" },
  advanced:     { from: "#fdba74", to: "#f97316", text: "#ea580c" },
  pro:          { from: "#c4b5fd", to: "#8b5cf6", text: "#7c3aed" },
}

/** SVG arc ring — 0..1 progress */
function RatingRing({
  value,
  maxValue = 8,
  label,
  gradFrom,
  gradTo,
  size = 88,
}: {
  value: number | null
  maxValue?: number
  label: string
  gradFrom: string
  gradTo: string
  size?: number
}) {
  const id = `ring-${label.replace(/\s/g, "")}`
  const radius = (size - 14) / 2
  const circumference = 2 * Math.PI * radius
  const progress = value != null ? Math.min(value / maxValue, 1) : 0
  const dashOffset = circumference * (1 - progress)
  const display = value != null ? value.toFixed(1) : "—"

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradFrom} />
              <stop offset="100%" stopColor={gradTo} />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={8}
          />
          {/* Progress */}
          {progress > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${id})`}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          )}
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black leading-none text-zinc-900">{display}</span>
          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide">/ 8.0</span>
        </div>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
    </div>
  )
}

export function PickleballRatingWidget({ profile }: PickleballRatingWidgetProps) {
  const skillKey = profile?.skill_level ?? "beginner"
  const skillLabel = profile?.skill_level ? SKILL_LABEL[profile.skill_level] : null
  const colors = SKILL_COLOR[skillKey] ?? SKILL_COLOR.beginner

  if (profile === null) {
    return (
      <div
        className="animate-fade-in-up rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{ background: "#ffffff", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="size-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
          >
            <span className="text-xl leading-none">🏓</span>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-green-600">
              Pickleball Rating
            </p>
            <p className="text-sm font-semibold text-zinc-500 mt-0.5">
              Completa tu perfil para obtener tu rating
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/account"
          className="shrink-0 text-[11px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-full text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
        >
          Completar perfil
        </Link>
      </div>
    )
  }

  return (
    <div
      className="animate-fade-in-up rounded-2xl p-5 flex items-center gap-6"
      style={{ background: "#ffffff", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
    >
      {/* Icon + label */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className="size-12 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
        >
          <span className="text-2xl leading-none">🏓</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-green-600">
          Pickleball
        </p>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-muted shrink-0" />

      {/* Rating rings */}
      <div className="flex items-center gap-6 flex-1">
        <RatingRing
          value={profile.singles_rating}
          label="Singles"
          gradFrom="#86efac"
          gradTo="#16a34a"
        />
        <RatingRing
          value={profile.doubles_rating}
          label="Dobles"
          gradFrom="#fde68a"
          gradTo="#f59e0b"
        />
      </div>

      {/* Skill badge + link */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        {skillLabel && (
          <span
            className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colors.from}33, ${colors.to}22)`,
              color: colors.text,
              border: `1px solid ${colors.from}`,
            }}
          >
            {skillLabel}
          </span>
        )}
        <Link
          href="/dashboard/ranking"
          className="text-[11px] font-bold text-zinc-400 hover:text-green-600 transition-colors"
        >
          Ver ranking →
        </Link>
      </div>
    </div>
  )
}
