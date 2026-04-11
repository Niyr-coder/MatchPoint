import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminEventsView } from "@/components/admin/AdminEventsView"
import type { EventWithClub } from "@/features/activities/types"
import { mapEventRow } from "@/features/activities/utils"

async function fetchAllEvents(): Promise<EventWithClub[]> {
  const supabase = createServiceClient()

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
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapEventRow)
}

export default async function AdminEventsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const supabase = createServiceClient()
  const [events, clubsResult] = await Promise.all([
    fetchAllEvents(),
    supabase.from("clubs").select("id, name").eq("is_active", true).order("name"),
  ])

  const clubs = (clubsResult.data ?? []) as { id: string; name: string }[]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Admin · Eventos"
        title="Eventos de la Plataforma"
        description="Supervisión y gestión de todos los eventos registrados"
      />
      <AdminEventsView events={events} clubs={clubs} />
    </div>
  )
}
