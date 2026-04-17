import type { EventWithClub } from "@/features/activities/types"
import type { EventFormState } from "@/features/activities/components/EventForm"

// ── mapEventRow ────────────────────────────────────────────────────────────────
// Maps a raw Supabase row (with optional `clubs` and `event_registrations` joins)
// to a typed EventWithClub. Fields not included in the select (is_featured,
// created_by, updated_at) default to safe sentinel values.

export function mapEventRow(row: Record<string, unknown>): EventWithClub {
  return {
    id:                    row.id as string,
    title:                 row.title as string,
    description:           row.description as string | null,
    sport:                 row.sport as string | null,
    event_type:            row.event_type as EventWithClub["event_type"],
    status:                row.status as EventWithClub["status"],
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
    event_includes:        (row.event_includes as string[] | null) ?? [],
    organizer_name:        row.organizer_name as string | null,
    organizer_contact:     row.organizer_contact as string | null,
    is_featured:           Boolean(row.is_featured),
    created_by:            null,
    created_at:            row.created_at as string,
    updated_at:            (row.updated_at as string | null) ?? null,
    registration_count:    (row.event_registrations as { count: number }[])?.[0]?.count ?? 0,
  }
}

// ── eventToForm ────────────────────────────────────────────────────────────────
// Converts an EventWithClub (DB shape) into an EventFormState (form shape).

export function eventToForm(event: EventWithClub): EventFormState {
  return {
    title:                 event.title,
    description:           event.description ?? "",
    event_type:            event.event_type ?? "social",
    sport:                 event.sport ?? "",
    club_id:               event.club_id ?? "",
    city:                  event.city ?? "",
    location:              event.location ?? "",
    start_date:            event.start_date.split("T")[0] ?? "",
    start_time:            event.start_date.includes("T")
      ? event.start_date.split("T")[1]?.slice(0, 5) ?? "09:00"
      : "09:00",
    end_date:              event.end_date?.split("T")[0] ?? "",
    end_time:              event.end_date?.includes("T")
      ? event.end_date.split("T")[1]?.slice(0, 5) ?? ""
      : "",
    image_url:             event.image_url ?? "",
    max_capacity:          event.max_capacity != null ? String(event.max_capacity) : "",
    is_free:               event.is_free,
    price:                 event.price != null ? String(event.price) : "",
    visibility:            event.visibility,
    registration_deadline: event.registration_deadline?.split("T")[0] ?? "",
    min_participants:      event.min_participants != null ? String(event.min_participants) : "",
    organizer_name:        event.organizer_name ?? "",
    organizer_contact:     event.organizer_contact ?? "",
    tags:                  event.tags ?? [],
    event_includes:        event.event_includes,
    publishImmediately:    false,
  }
}
