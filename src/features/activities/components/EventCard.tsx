import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, Users, Tag } from "lucide-react"
import { EVENT_TYPE_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import type { EventType } from "@/features/activities/types"

interface EventCardProps {
  id: string
  title: string
  description: string | null
  sport: string | null
  event_type: EventType | null
  city: string | null
  location: string | null
  start_date: string
  image_url: string | null
  is_free: boolean
  price: number | null
  max_capacity: number | null
  registration_count: number
  club_name?: string | null
  href?: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function EventCard({
  id,
  title,
  description,
  sport,
  event_type,
  city,
  location,
  start_date,
  image_url,
  is_free,
  price,
  max_capacity,
  registration_count,
  club_name,
  href,
}: EventCardProps) {
  const typeCfg = event_type ? EVENT_TYPE_CONFIG[event_type] : null
  const spotsLeft = max_capacity != null ? max_capacity - registration_count : null
  const isFull = spotsLeft != null && spotsLeft <= 0
  const cardHref = href ?? `/dashboard/events/${id}`

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden flex flex-col hover:border-zinc-300 transition-all group">
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

        {/* Price pill — top right */}
        <div className="absolute top-3 right-3">
          {is_free ? (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] shadow-sm">
              Gratis
            </span>
          ) : price != null ? (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-white text-[#0a0a0a] border border-[#e5e5e5] shadow-sm">
              ${price.toFixed(2)}
            </span>
          ) : null}
        </div>

        {/* Full badge */}
        {isFull && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs font-black uppercase tracking-wide text-white bg-red-600 px-3 py-1 rounded-full">
              Lleno
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeCfg && (
            <span
              className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}
            >
              {typeCfg.label}
            </span>
          )}
          {sport && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
              {SPORT_LABELS[sport] ?? sport}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-black text-[#0a0a0a] leading-tight line-clamp-2">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Club name */}
        {club_name && (
          <div className="flex items-center gap-1.5">
            <Tag className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500 truncate">{club_name}</span>
          </div>
        )}

        {/* Meta */}
        <div className="mt-auto pt-3 border-t border-[#f5f5f5] flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500 capitalize">{formatDate(start_date)}</span>
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
            <div className="flex items-center gap-1.5">
              <Users className="size-3 text-zinc-400 shrink-0" />
              <span className="text-[11px] text-zinc-500">
                {registration_count}
                <span className="text-zinc-300">/{max_capacity}</span>
                {" "}lugares
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={cardHref}
          className="mt-1 w-full text-center bg-[#0a0a0a] text-white text-xs font-black uppercase tracking-wide rounded-full py-2.5 hover:bg-zinc-700 transition-colors"
        >
          Ver más
        </Link>
      </div>
    </div>
  )
}
