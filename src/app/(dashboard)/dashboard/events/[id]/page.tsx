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
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  UserCircle,
  Phone,
  Building2,
  ArrowLeft,
  Tag,
} from "lucide-react"

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-EC", {
    hour:   "2-digit",
    minute: "2-digit",
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
      visibility, registration_deadline, tags,
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

  const typeCfg  = event.event_type ? EVENT_TYPE_CONFIG[event.event_type] : null
  const spotsLeft = event.max_capacity != null
    ? event.max_capacity - event.registration_count
    : null
  const isFull         = spotsLeft != null && spotsLeft <= 0
  const deadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline) < new Date()
    : false
  const canRegister = event.status === "published" && !isFull && !deadlinePassed
  const daysLeft    = event.registration_deadline ? daysUntil(event.registration_deadline) : null

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
           style={{ height: "280px" }}>

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

      {/* ── Quick info ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Date */}
        <div className="flex items-start gap-2.5 rounded-xl bg-card border border-border p-3.5">
          <Calendar className="size-4 text-zinc-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-foreground capitalize leading-tight">
              {formatDate(event.start_date)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {formatTime(event.start_date)}
              {event.end_date && ` – ${formatTime(event.end_date)}`}
            </p>
          </div>
        </div>

        {/* Location */}
        {(event.location ?? event.city) ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-card border border-border p-3.5">
            <MapPin className="size-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              {event.location && (
                <p className="text-xs font-black text-foreground leading-tight">{event.location}</p>
              )}
              {event.city && (
                <p className="text-[11px] text-zinc-400 mt-0.5">{event.city}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border p-3.5" />
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

        {/* Context line */}
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
            Quiénes van
          </p>
          <div className="flex items-center gap-3">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {attendees.slice(0, 7).map((a) => (
                <div
                  key={a.user_id}
                  className="size-8 rounded-full bg-muted border-2 border-background flex items-center justify-center overflow-hidden shrink-0"
                >
                  {a.avatar_url ? (
                    <Image
                      src={a.avatar_url}
                      alt={a.display_name ?? ""}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <UserCircle className="size-4 text-zinc-400" />
                  )}
                </div>
              ))}
              {attendees.length > 7 && (
                <div className="size-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-black text-zinc-500">
                  +{attendees.length - 7}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              <span className="font-bold text-foreground">{event.registration_count}</span>{" "}
              persona{event.registration_count !== 1 ? "s" : ""} inscrita{event.registration_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Organizer ────────────────────────────────────────── */}
      {(event.organizer_name ?? event.club_name) && (
        <div className="mt-6 pt-5 border-t border-border flex flex-col gap-2.5">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
            Organiza
          </p>
          {event.club_name && (
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs font-bold text-foreground">{event.club_name}</span>
            </div>
          )}
          {event.organizer_name && (
            <div className="flex items-center gap-2">
              <UserCircle className="size-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-600">{event.organizer_name}</span>
            </div>
          )}
          {event.organizer_contact && (
            <div className="flex items-center gap-2">
              <Phone className="size-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-500">{event.organizer_contact}</span>
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="h-8" />
    </div>
  )
}
