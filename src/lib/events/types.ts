export type EventType =
  | "social"
  | "clinic"
  | "workshop"
  | "open_day"
  | "exhibition"
  | "masterclass"
  | "quedada"
  | "other"

export type EventStatus = "draft" | "published" | "cancelled" | "completed"

export type EventVisibility = "public" | "members_only" | "private"

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
