import type { SportType } from "@/features/clubs/types"

// ──────────────────────────────────────────────────────────
// EventRow — DB-level shape (from lib/events/types.ts)
// ──────────────────────────────────────────────────────────

export type EventType =
  | "social"
  | "clinic"
  | "workshop"
  | "open_day"
  | "exhibition"
  | "masterclass"
  | "quedada"
  | "ranking"
  | "other"

export type EventStatus = "draft" | "published" | "cancelled" | "completed"

export type EventVisibility = "public" | "members_only" | "invite_only" | "club_only" | "private"

export interface EventRow {
  id: string
  title: string
  description: string | null
  sport: string | null
  event_type: EventType | null
  status: EventStatus
  club_id: string | null
  location: string | null
  city: string | null
  start_date: string
  end_date: string | null
  image_url: string | null
  is_featured: boolean
  is_free: boolean
  price: number | null
  max_capacity: number | null
  min_participants: number | null
  visibility: EventVisibility
  registration_deadline: string | null
  tags: string[] | null
  organizer_name: string | null
  organizer_contact: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
}

export interface EventWithClub extends EventRow {
  club_name: string | null
  registration_count: number
  is_registered?: boolean
}

// ──────────────────────────────────────────────────────────
// Event — application-level shape (from lib/events/queries.ts)
// ──────────────────────────────────────────────────────────

export interface Event {
  id: string
  title: string
  description: string | null
  sport: SportType | null
  location: string | null
  city: string | null
  start_date: string
  end_date: string | null
  image_url: string | null
  is_featured: boolean
  created_by: string | null
  created_at: string
  // New columns from migration 030
  club_id: string | null
  event_type: EventType
  status: EventStatus
  max_capacity: number | null
  price: number
  is_free: boolean
  visibility: EventVisibility
  registration_deadline: string | null
  min_participants: number | null
  tags: string[]
  updated_at: string | null
  organizer_name: string | null
  organizer_contact: string | null
}

export interface EventWithCount extends Event {
  registration_count: number
}

export interface EventWithRegistration extends EventWithCount {
  is_registered: boolean
}

export interface EventRegistration {
  id: string
  event_id: string
  user_id: string
  registered_at: string
}

export interface EventRegistrationWithProfile extends EventRegistration {
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    username: string | null
  } | null
}

export interface CreateEventInput {
  title: string
  description?: string | null
  sport?: SportType | null
  event_type: EventType
  club_id?: string | null
  location: string
  city: string
  start_date: string
  end_date?: string | null
  image_url?: string | null
  max_capacity?: number | null
  price?: number
  is_free: boolean
  visibility: EventVisibility
  registration_deadline?: string | null
  min_participants?: number | null
  tags?: string[]
  organizer_name?: string | null
  organizer_contact?: string | null
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus
  is_featured?: boolean
}

export interface EventFilters {
  sport?: string
  event_type?: string
  city?: string
  club_id?: string
  status?: string
  is_free?: boolean
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  limit?: number
}
