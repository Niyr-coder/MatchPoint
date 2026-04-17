import Image from "next/image"
import { Calendar, MapPin, Users, Tag } from "lucide-react"
import { orgInitials } from "@/features/activities/lib/helpers"
import { EVENT_TYPE_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import { EventCardCTA } from "@/features/activities/components/EventCardCTA"
import type { EventType, EventVisibility } from "@/features/activities/types"

// ── Helpers (exported for unit testing) ──────────────────────────────────────

export function formatTimeRange(startDate: string, endDate?: string | null): string {
  const fmt = (d: Date) => {
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, "0")
    return `${h}:${m}`
  }
  const start = new Date(startDate)
  if (!endDate) return fmt(start)
  const end = new Date(endDate)
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const durationLabel = diffHours % 1 === 0 ? `${diffHours}h` : `${diffHours.toFixed(1)}h`
  return `${fmt(start)}–${fmt(end)} (${durationLabel})`
}

export function daysUntilDeadline(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function capacityColor(count: number, max: number): "black" | "amber" | "red" {
  const pct = count / max
  if (pct >= 1) return "red"
  if (pct >= 0.75) return "amber"
  return "black"
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}


const VISIBILITY_CONFIG: Record<string, { label: string; className: string }> = {
  club_only:   { label: "🔒 Miembros",   className: "bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]" },
  invite_only: { label: "✉️ Invitación", className: "bg-[#fdf4ff] text-[#a21caf] border-[#f5d0fe]" },
}

const CAP_COLOR: Record<"black" | "amber" | "red", string> = {
  black: "#0a0a0a",
  amber: "#f59e0b",
  red:   "#ef4444",
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EventCardProps {
  id: string
  title: string
  description: string | null
  sport: string | null
  event_type: EventType | null
  city: string | null
  location: string | null
  start_date: string
  end_date?: string | null
  image_url: string | null
  is_free: boolean
  is_featured?: boolean
  price: number | null
  max_capacity: number | null
  registration_count: number
  club_name?: string | null
  registration_deadline?: string | null
  visibility?: EventVisibility | null
  tags?: string[] | null
  organizer_name?: string | null
  is_registered?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EventCard({
  id,
  title,
  description,
  sport,
  event_type,
  city,
  location,
  start_date,
  end_date,
  image_url,
  is_free,
  is_featured,
  price,
  max_capacity,
  registration_count,
  club_name,
  registration_deadline,
  visibility,
  tags,
  organizer_name,
  is_registered,
}: EventCardProps) {
  const typeCfg   = event_type ? EVENT_TYPE_CONFIG[event_type] : null
  const spotsLeft = max_capacity != null ? max_capacity - registration_count : null
  const isFull    = spotsLeft != null && spotsLeft <= 0

  const deadlineDays   = registration_deadline ? daysUntilDeadline(registration_deadline) : null
  const showUrgency    = deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 3
  const urgencyDate    = registration_deadline
    ? new Date(registration_deadline).toLocaleDateString("es-EC", { day: "numeric", month: "short" })
    : null
  const deadlinePassed = registration_deadline ? new Date(registration_deadline) < new Date() : false
  const canRegister    = !isFull && !deadlinePassed

  const capColor   = max_capacity != null ? capacityColor(registration_count, max_capacity) : "black"
  const capPct     = max_capacity != null ? Math.min(100, (registration_count / max_capacity) * 100) : 0
  const visConfig  = visibility && visibility !== "public" ? VISIBILITY_CONFIG[visibility] : null
  const timeRange  = formatTimeRange(start_date, end_date)
  const activeTags = (tags ?? []).slice(0, 3)

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col hover:border-zinc-300 transition-all group">
      {/* Cover image */}
      <div className="relative w-full h-44 shrink-0">
        {image_url ? (
          <Image
            src={image_url}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Calendar className="size-10 text-white/20" />
          </div>
        )}

        {is_featured && (
          <div className="absolute top-3 left-3">
            <span className="text-[11px] font-black px-2 py-1 rounded-full bg-[#fefce8] text-[#a16207] border border-[#fde047]">
              ★
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          {is_free ? (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] shadow-sm">
              Gratis
            </span>
          ) : price != null ? (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-card text-foreground border border-border shadow-sm">
              ${price.toFixed(2)}
            </span>
          ) : null}
        </div>

        {isFull && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs font-black uppercase tracking-wide text-white bg-red-600 px-3 py-1 rounded-full">
              Lleno
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeCfg && (
            <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
              {typeCfg.label}
            </span>
          )}
          {sport && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-zinc-600 border border-zinc-200">
              {SPORT_LABELS[sport] ?? sport}
            </span>
          )}
          {visConfig && (
            <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${visConfig.className}`}>
              {visConfig.label}
            </span>
          )}
          {is_registered && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#15803d] border border-[#86efac]">
              ✓ Inscrito
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-black text-foreground leading-tight line-clamp-2">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Organizer */}
        {organizer_name && (
          <div className="flex items-center gap-1.5">
            <div className="size-[18px] rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-black text-zinc-500">{orgInitials(organizer_name)}</span>
            </div>
            <span className="text-[11px] text-zinc-400 truncate">
              {organizer_name}{club_name ? ` · ${club_name}` : ""}
            </span>
          </div>
        )}

        {/* Club name (only if no organizer) */}
        {!organizer_name && club_name && (
          <div className="flex items-center gap-1.5">
            <Tag className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500 truncate">{club_name}</span>
          </div>
        )}

        {/* Tags */}
        {activeTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {activeTags.map((tag) => (
              <span key={tag} className="text-[10px] text-zinc-400 bg-[#fafafa] border border-[#f0f0f0] rounded px-1.5 py-0.5">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Urgency banner */}
        {showUrgency && (
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-black text-[#c2410c]">
              ⏰ Cierra {deadlineDays < 1 ? "hoy" : `en ${deadlineDays} día${deadlineDays !== 1 ? "s" : ""}`}
              {urgencyDate ? ` — ${urgencyDate}` : ""}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="mt-auto pt-2.5 border-t border-[#f5f5f5] flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500 capitalize">
              {formatDate(start_date)} · {timeRange}
            </span>
          </div>
          {(location ?? city) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3 text-zinc-400 shrink-0" />
              <span className="text-[11px] text-zinc-500 truncate">
                {[location, city].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
          {max_capacity != null && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3 text-zinc-400 shrink-0" />
                  <span className="text-[11px] text-zinc-500">
                    {registration_count} <span className="text-zinc-300">/ {max_capacity}</span> lugares
                  </span>
                </div>
                {capColor === "amber" && (
                  <span className="text-[10px] font-black text-[#f59e0b]">⚠ Casi lleno</span>
                )}
              </div>
              <div className="h-[4px] rounded-full bg-[#f5f5f5] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${capPct}%`, backgroundColor: CAP_COLOR[capColor] }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <EventCardCTA
          eventId={id}
          isRegistered={is_registered ?? false}
          canRegister={canRegister}
          isFull={isFull}
        />
      </div>
    </div>
  )
}
