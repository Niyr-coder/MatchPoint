import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClubEventsView } from "@/features/activities/components/ClubEventsView"
import type { EventWithClub } from "@/features/activities/types"
import { mapEventRow } from "@/features/activities/utils"

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

  return (data ?? []).map(mapEventRow)
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
