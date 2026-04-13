import { SINGLE_SPORT_MODE, VISIBLE_SPORT_IDS } from "@/lib/sports/config"
import type { EventType, EventVisibility } from "@/features/activities/types"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EventFormState {
  title: string
  description: string
  event_type: EventType
  sport: string
  club_id: string
  city: string
  location: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  image_url: string
  max_capacity: string
  is_free: boolean
  price: string
  visibility: EventVisibility
  registration_deadline: string
  min_participants: string
  organizer_name: string
  organizer_contact: string
  tags: string[]
  publishImmediately: boolean
}

export const EMPTY_EVENT_FORM: EventFormState = {
  title: "",
  description: "",
  event_type: "social",
  sport: SINGLE_SPORT_MODE ? VISIBLE_SPORT_IDS[0] : "",
  club_id: "",
  city: "",
  location: "",
  start_date: "",
  start_time: "09:00",
  end_date: "",
  end_time: "",
  image_url: "",
  max_capacity: "",
  is_free: true,
  price: "",
  visibility: "public",
  registration_deadline: "",
  min_participants: "",
  organizer_name: "",
  organizer_contact: "",
  tags: [],
  publishImmediately: false,
}

export interface ClubOption {
  id: string
  name: string
}

export interface EventFormProps {
  initial: EventFormState
  clubs?: ClubOption[]
  mode: "create" | "edit"
  loading: boolean
  error: string | null
  onSubmit: (form: EventFormState) => Promise<void>
  onCancel: () => void
  isAdmin?: boolean
}

export type SetField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void

// ── Constants ──────────────────────────────────────────────────────────────────

export const TYPE_EMOJI: Record<string, string> = {
  social: "🎉",
  clinic: "📋",
  workshop: "🛠️",
  open_day: "🌟",
  exhibition: "🏆",
  masterclass: "👑",
  quedada: "🤝",
  ranking: "🏅",
  other: "⚡",
}

export const STEP_LABELS = ["Básicos", "Fecha & lugar", "Detalles", "Extras"] as const
