import Image from "next/image"
import { notFound } from "next/navigation"
import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EventRegisterButton } from "@/features/activities/components/EventRegisterButton"
import {
  EVENT_TYPE_CONFIG,
  EVENT_STATUS_CONFIG,
  SPORT_LABELS,
} from "@/features/activities/constants"
import type { EventWithClub, EventType, EventStatus } from "@/features/activities/types"
import {
  Calendar,
  MapPin,
  Users,
  Tag,
  Clock,
  UserCircle,
  Phone,
  Building2,
} from "lucide-react"

function formatDateTime(dateStr: string, timeStr?: string | null): string {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return date
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Attendee {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

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

  const row = data as Record<string, unknown>

  const event: EventWithClub = {
    id:                    row.id as string,
    title:                 row.title as string,
    description:           row.description as string | null,
    sport:                 row.sport as string | null,
    event_type:            row.event_type as EventType | null,
    status:                row.status as EventStatus,
    club_id:               row.club_id as string | null,
    club_name:             (row.clubs as { name: string } | null)?.name ?? null,
    city:                  row.city as string | null,
    location:              row.location as string | null,
    start_date:            row.start_date as string,
    end_date:              row.end_date as string | null,
    image_url:             row.image_url as string | null,
    is_free:               row.is_free as boolean,
    price:                 row.price as number | null,
    max_capacity:          row.max_capacity as number | null,
    min_participants:      row.min_participants as number | null,
    visibility:            row.visibility as EventWithClub["visibility"],
    registration_deadline: row.registration_deadline as string | null,
    tags:                  row.tags as string[] | null,
    organizer_name:        row.organizer_name as string | null,
    organizer_contact:     row.organizer_contact as string | null,
    is_featured:           false,
    created_by:            null,
    created_at:            row.created_at as string,
    updated_at:            row.updated_at as string | null,
    registration_count:    (row.event_registrations as { count: number }[])?.[0]?.count ?? 0,
  }

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
      const row = r as Record<string, unknown>
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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await authorizeOrRedirect()
  const { id } = await params

  const result = await fetchEventDetail(id, userId)
  if (!result) notFound()

  const { event, isRegistered, attendees } = result
  const typeCfg   = event.event_type ? EVENT_TYPE_CONFIG[event.event_type] : null
  const statusCfg = EVENT_STATUS_CONFIG[event.status]
  const spotsLeft = event.max_capacity != null
    ? event.max_capacity - event.registration_count
    : null
  const isFull    = spotsLeft != null && spotsLeft <= 0
  const deadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline) < new Date()
    : false
  const canRegister =
    event.status === "published" && !isFull && !deadlinePassed

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <PageHeader
        label="Comunidad · Evento"
        title={event.title}
      />

      {/* Cover image */}
      {event.image_url && (
        <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden">
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {typeCfg && (
              <span
                className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}
              >
                {typeCfg.label}
              </span>
            )}
            {event.sport && (
              <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-muted text-zinc-600 border border-zinc-200">
                {SPORT_LABELS[event.sport] ?? event.sport}
              </span>
            )}
            <StatusBadge
              label={statusCfg.label}
              variant={statusCfg.variant}
            />
            {event.is_free ? (
              <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-success text-primary border border-success-border">
                Gratis
              </span>
            ) : event.price != null ? (
              <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-card text-foreground border border-border">
                ${event.price.toFixed(2)}
              </span>
            ) : null}
          </div>

          {/* Description */}
          {event.description && (
            <div className="rounded-2xl bg-card border border-border p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
                Descripción
              </p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
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

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-5">
              <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-4">
                Asistentes ({event.registration_count})
              </p>
              <div className="flex flex-col gap-2">
                {attendees.map((a) => (
                  <div key={a.user_id} className="flex items-center gap-2.5">
                    <div className="size-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {a.avatar_url ? (
                        <Image
                          src={a.avatar_url}
                          alt={a.display_name ?? ""}
                          width={28}
                          height={28}
                          className="object-cover"
                        />
                      ) : (
                        <UserCircle className="size-4 text-zinc-400" />
                      )}
                    </div>
                    <span className="text-sm text-zinc-700">
                      {a.display_name ?? "Usuario"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Info card */}
          <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
              Detalles
            </p>

            <div className="flex flex-col gap-3">
              {/* Date */}
              <div className="flex items-start gap-2.5">
                <Calendar className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-zinc-700 capitalize">
                    {formatDateTime(event.start_date)}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {formatTime(event.start_date)}
                    {event.end_date && ` – ${formatTime(event.end_date)}`}
                  </p>
                </div>
              </div>

              {/* Location */}
              {(event.location ?? event.city) && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    {event.location && (
                      <p className="text-xs font-bold text-zinc-700">{event.location}</p>
                    )}
                    {event.city && (
                      <p className="text-[11px] text-zinc-400">{event.city}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Capacity */}
              {event.max_capacity != null && (
                <div className="flex items-start gap-2.5">
                  <Users className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-700">
                      {event.registration_count}
                      <span className="text-zinc-400 font-normal">/{event.max_capacity}</span>
                      {" "}inscritos
                    </p>
                    {spotsLeft != null && spotsLeft > 0 && (
                      <p className="text-[11px] text-zinc-400">{spotsLeft} lugar{spotsLeft !== 1 ? "es" : ""} disponible{spotsLeft !== 1 ? "s" : ""}</p>
                    )}
                    {isFull && (
                      <p className="text-[11px] text-red-500 font-bold">Evento lleno</p>
                    )}
                  </div>
                </div>
              )}

              {/* Registration deadline */}
              {event.registration_deadline && (
                <div className="flex items-start gap-2.5">
                  <Clock className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-700">Límite de registro</p>
                    <p className="text-[11px] text-zinc-400">
                      {new Date(event.registration_deadline).toLocaleDateString("es-EC", {
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Club */}
              {event.club_name && (
                <div className="flex items-start gap-2.5">
                  <Building2 className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-zinc-700">{event.club_name}</p>
                </div>
              )}

              {/* Organizer */}
              {event.organizer_name && (
                <div className="flex items-start gap-2.5">
                  <UserCircle className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-700">{event.organizer_name}</p>
                    {event.organizer_contact && (
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Phone className="size-2.5" />
                        {event.organizer_contact}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Register button */}
          <EventRegisterButton
            eventId={event.id}
            isRegistered={isRegistered}
            canRegister={canRegister}
            isFull={isFull}
            status={event.status}
          />
        </div>
      </div>
    </div>
  )
}
