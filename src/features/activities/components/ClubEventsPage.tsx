import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClubEventsView } from "@/features/activities/components/ClubEventsView"
import { mapEventRow } from "@/features/activities/utils"
import type { EventWithClub } from "@/features/activities/types"

// ── Types ──────────────────────────────────────────────────────────────────────

export type ClubRole = "owner" | "manager"

interface RoleConfig {
  label: string
  description: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<ClubRole, RoleConfig> = {
  owner: {
    label: "Owner · Eventos",
    description: "Crea y gestiona los eventos de tu club",
  },
  manager: {
    label: "Manager · Eventos",
    description: "Gestiona los eventos y supervisa las inscripciones",
  },
}

// ── Data fetching ──────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

interface ClubEventsPageProps {
  clubId: string
  role: ClubRole
}

export async function ClubEventsPageContent({ clubId, role }: ClubEventsPageProps) {
  const config = ROLE_CONFIG[role]
  const events = await fetchClubEvents(clubId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label={config.label}
        title="Eventos del Club"
        description={config.description}
      />
      <ClubEventsView events={events} clubId={clubId} role={role} />
    </div>
  )
}
