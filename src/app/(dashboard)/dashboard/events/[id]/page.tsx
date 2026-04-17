import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { EventRegisterButton } from "@/features/activities/components/EventRegisterButton"
import {
  EVENT_TYPE_CONFIG,
  SPORT_LABELS,
} from "@/features/activities/constants"
import type { EventWithClub } from "@/features/activities/types"
import { mapEventRow } from "@/features/activities/utils"
import { Users, Clock, ArrowLeft, Tag } from "lucide-react"
import { orgInitials, attendeeColor } from "@/features/activities/lib/helpers"
import { formatTimeRange } from "@/features/activities/components/EventCard"

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    year:    "numeric",
  })
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Attendee {
  user_id:      string
  display_name: string | null
  avatar_url:   string | null
}

// ── Data ───────────────────────────────────────────────────────────────────────

async function fetchEventDetail(
  id: string,
  userId: string,
): Promise<{ event: EventWithClub; isRegistered: boolean; attendees: Attendee[] } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, title, description, sport, event_type, status,
      club_id, city, location, start_date, end_date,
      image_url, is_free, price, max_capacity, min_participants,
      visibility, registration_deadline, tags, event_includes,
      organizer_name, organizer_contact, created_at, updated_at,
      clubs ( name ),
      event_registrations ( count )
      `,
    )
    .eq("id", id)
    .single()

  if (error || !data) return null

  const event: EventWithClub = mapEventRow(data as Record<string, unknown>)

  const [regResult, attendeesResult] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("user_id")
      .eq("event_id", id)
      .eq("user_id", userId)
      .maybeSingle(),
    event.visibility === "public"
      ? supabase
          .from("event_registrations")
          .select("user_id, profiles ( display_name, avatar_url )")
          .eq("event_id", id)
          .limit(50)
      : Promise.resolve({ data: [] }),
  ])

  const isRegistered = Boolean(regResult.data)

  const attendees: Attendee[] = ((attendeesResult as { data: unknown[] }).data ?? []).map(
    (r: unknown) => {
      const row     = r as Record<string, unknown>
      const profile = row.profiles as Record<string, unknown> | null
      return {
        user_id:      row.user_id as string,
        display_name: (profile?.display_name as string | null) ?? null,
        avatar_url:   (profile?.avatar_url as string | null) ?? null,
      }
    },
  )

  return { event, isRegistered, attendees }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await authorizeOrRedirect()
  const { id }     = await params

  const result = await fetchEventDetail(id, userId)
  if (!result) notFound()

  const { event, isRegistered, attendees } = result

  const typeCfg    = event.event_type ? EVENT_TYPE_CONFIG[event.event_type] : null
  const spotsLeft  = event.max_capacity != null
    ? event.max_capacity - event.registration_count
    : null
  const isFull         = spotsLeft != null && spotsLeft <= 0
  const deadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline) < new Date()
    : false
  const canRegister = event.status === "published" && !isFull && !deadlinePassed
  const daysLeft    = event.registration_deadline ? daysUntil(event.registration_deadline) : null

  const showLocationChip = Boolean(event.location ?? event.city)
  const showCapacityChip = event.max_capacity != null

  return (
    <div className="flex flex-col gap-0 max-w-3xl mx-auto w-full">

      {/* Back link */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 hover:text-zinc-700 transition-colors mb-4"
      >
        <ArrowLeft className="size-3.5" />
        Eventos
      </Link>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-100"
           style={{ height: "340px" }}>

        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        ) : (
          <div
            className={`absolute inset-0 ${typeCfg?.bg ?? "bg-zinc-100"} flex items-center justify-center`}
          >
            <span className={`text-5xl font-black uppercase tracking-tighter opacity-20 ${typeCfg?.color ?? "text-zinc-400"}`}>
              {event.title.slice(0, 2)}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          {typeCfg && (
            <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border backdrop-blur-sm ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
              {typeCfg.label}
            </span>
          )}
          {event.sport && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/80 text-zinc-700 border border-white/60 backdrop-blur-sm">
              {SPORT_LABELS[event.sport] ?? event.sport}
            </span>
          )}
        </div>

        {/* Price badge top-right */}
        {!event.is_free && event.price != null ? (
          <div className="absolute top-3 right-3 bg-foreground text-white text-sm font-black px-3 py-1.5 rounded-full">
            ${event.price.toFixed(2)}
          </div>
        ) : event.is_free ? (
          <div className="absolute top-3 right-3 bg-white/90 text-emerald-700 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border border-emerald-200">
            Gratis
          </div>
        ) : null}

        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
            {event.title}
          </h1>
          {(event.club_name ?? event.city) && (
            <p className="text-[12px] text-white/70 mt-1 font-medium">
              {[event.club_name, event.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* ── Info chips ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0] capitalize">
          📅 {formatDateShort(event.start_date)}
        </span>

        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]">
          🕘 {formatTimeRange(event.start_date, event.end_date)}
        </span>

        {showLocationChip && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-[#fdf4ff] text-[#a21caf] border-[#f5d0fe]">
            📍 {[event.location, event.city].filter(Boolean).join(", ")}
          </span>
        )}

        {showCapacityChip && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]">
            👥 {isFull ? "Lleno" : `${spotsLeft} lugar${spotsLeft !== 1 ? "es" : ""} libre${spotsLeft !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {/* ── Registration CTA ─────────────────────────────────── */}
      <div className="mt-4 rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
        <EventRegisterButton
          eventId={event.id}
          isRegistered={isRegistered}
          canRegister={canRegister}
          isFull={isFull}
          status={event.status}
        />

        {event.status === "published" && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {event.max_capacity != null && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                <Users className="size-3.5" />
                {event.registration_count}
                {event.max_capacity != null && `/${event.max_capacity}`} inscritos
                {!isFull && spotsLeft != null && (
                  <span className="text-emerald-600 font-bold ml-1">· {spotsLeft} lugar{spotsLeft !== 1 ? "es" : ""} libre{spotsLeft !== 1 ? "s" : ""}</span>
                )}
                {isFull && <span className="text-red-500 font-bold ml-1">· Lleno</span>}
              </span>
            )}
            {daysLeft != null && !deadlinePassed && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                <Clock className="size-3.5" />
                {daysLeft === 0
                  ? "Último día para registrarse"
                  : daysLeft === 1
                  ? "1 día para registrarse"
                  : `${daysLeft} días para registrarse`}
              </span>
            )}
            {deadlinePassed && !isRegistered && (
              <span className="text-[11px] text-zinc-400 font-medium">Registro cerrado</span>
            )}
          </div>
        )}
      </div>

      {/* ── Description ──────────────────────────────────────── */}
      {event.description && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Sobre el evento
          </p>
          <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>

          {event.event_includes && event.event_includes.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-2">
                Incluye
              </p>
              <div className="flex flex-wrap gap-1.5">
                {event.event_includes.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] px-2.5 py-1 rounded-md text-[11px] font-bold"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tags ─────────────────────────────────────────────── */}
      {event.tags && event.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <Tag className="size-3.5 text-zinc-400 shrink-0" />
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-bold bg-muted text-zinc-600 rounded-full px-2.5 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Attendees ────────────────────────────────────────── */}
      {attendees.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Quiénes van ({event.registration_count})
          </p>
          <div className="flex flex-col gap-0.5">
            {attendees.slice(0, 3).map((a) => {
              const name     = a.display_name ?? "Usuario"
              const initials = name
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .slice(0, 2)
                .join("")
              const color = attendeeColor(a.user_id)
              return (
                <div
                  key={a.user_id}
                  className="flex items-center gap-2.5 py-1.5 border-b border-zinc-50"
                >
                  <div
                    className="size-[30px] rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{ background: color.bg, color: color.text }}
                  >
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{name}</span>
                </div>
              )
            })}
          </div>
          {event.registration_count > 3 && (
            <span className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold text-blue-500 cursor-default">
              Ver todos los inscritos ({event.registration_count}) →
            </span>
          )}
        </div>
      )}

      {/* ── Organizer ────────────────────────────────────────── */}
      {(event.organizer_name ?? event.club_name) && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Organiza
          </p>
          <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-[46px] rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}
              >
                {orgInitials(event.club_name ?? event.organizer_name ?? "")}
              </div>
              <div>
                {event.club_name && (
                  <p className="text-[13px] font-black text-foreground leading-tight">{event.club_name}</p>
                )}
                {event.organizer_name && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">Contacto: {event.organizer_name}</p>
                )}
              </div>
            </div>

            {event.organizer_contact && (
              <a
                href={`https://wa.me/${event.organizer_contact.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] hover:bg-[#dcfce7] transition-colors"
              >
                📱 WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-8" />
    </div>
  )
}
