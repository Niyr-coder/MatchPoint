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

function RatingPill({ value, label }: { value: number | null; label: string }) {
  const display = value != null ? value.toFixed(1) : "—"
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-black text-[#0a0a0a] leading-none">{display}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
        {label}
      </span>
    </div>
  )
}

export function PickleballRatingWidget({ profile }: PickleballRatingWidgetProps) {
  if (profile === null) {
    return (
      <div className="animate-fade-in-up rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#f0fdf4] flex items-center justify-center shrink-0">
            <span className="text-xl leading-none">🏓</span>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#16a34a]">
              Pickleball
            </p>
            <p className="text-sm font-bold text-zinc-500 mt-0.5">
              Aún no tienes un perfil de rating
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/account"
          className="shrink-0 text-[11px] font-black uppercase tracking-[0.1em] px-4 py-2 bg-[#16a34a] text-white rounded-full hover:bg-[#15803d] transition-colors"
        >
          Completar perfil
        </Link>
      </div>
    )
  }

  const skillLabel = profile.skill_level ? SKILL_LABEL[profile.skill_level] : null

  return (
    <div className="animate-fade-in-up rounded-2xl bg-white border border-zinc-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center shrink-0">
            <span className="text-lg leading-none">🏓</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#16a34a]">
              Pickleball
            </p>
            <p className="text-sm font-black text-[#0a0a0a]">Tu Rating</p>
          </div>
        </div>
        {skillLabel && (
          <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
            {skillLabel}
          </span>
        )}
      </div>

      {/* Rating values */}
      <div className="flex items-center gap-6 pl-1">
        <RatingPill value={profile.singles_rating} label="Singles" />
        <div className="w-px h-8 bg-zinc-200 shrink-0" />
        <RatingPill value={profile.doubles_rating} label="Dobles" />
        <div className="flex-1" />
        <Link
          href="/dashboard/ranking"
          className="text-[11px] font-bold text-zinc-400 hover:text-[#16a34a] transition-colors"
        >
          Ver ranking →
        </Link>
      </div>
    </div>
  )
}
