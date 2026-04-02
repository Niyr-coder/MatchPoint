import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClubEventsView } from "@/components/events/ClubEventsView"
import type { EventWithClub, EventType, EventStatus } from "@/lib/events/types"

async function fetchClubEvents(clubId: string): Promise<EventWithClub[]> {
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
      event_registrations ( count )
      `,
    )
    .eq("club_id", clubId)
    .order("start_date", { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id:                    row.id as string,
    title:                 row.title as string,
    description:           row.description as string | null,
    sport:                 row.sport as string | null,
    event_type:            row.event_type as EventType | null,
    status:                row.status as EventStatus,
    club_id:               row.club_id as string | null,
    club_name:             null,
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
  }))
}

export default async function ManagerEventsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  const events = await fetchClubEvents(clubId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Manager · Eventos"
        title="Eventos del Club"
        description="Gestiona los eventos y supervisa las inscripciones"
      />
      <ClubEventsView events={events} clubId={clubId} role="manager" />
    </div>
  )
}
