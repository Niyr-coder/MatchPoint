import type { EventStatus, EventType } from "./types"

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; bg: string; border: string }
> = {
  social:      { label: "Social",      color: "text-pink-700",   bg: "bg-pink-50",   border: "border-pink-200" },
  clinic:      { label: "Clínica",     color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  workshop:    { label: "Workshop",    color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  open_day:    { label: "Día Abierto", color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
  exhibition:  { label: "Exhibición",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  masterclass: { label: "Masterclass", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  quedada:     { label: "Quedada",     color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  other:       { label: "Otro",        color: "text-zinc-600",   bg: "bg-zinc-100",  border: "border-zinc-200" },
}

export const EVENT_STATUS_CONFIG: Record<
  EventStatus,
  { label: string; variant: "neutral" | "success" | "error" | "info" }
> = {
  draft:     { label: "Borrador",   variant: "neutral" },
  published: { label: "Publicado",  variant: "success" },
  cancelled: { label: "Cancelado",  variant: "error"   },
  completed: { label: "Completado", variant: "info"    },
}

export const SPORT_LABELS: Record<string, string> = {
  futbol:     "Fútbol",
  padel:      "Pádel",
  tenis:      "Tenis",
  pickleball: "Pickleball",
}

export const SPORTS = [
  { value: "futbol",     label: "Fútbol" },
  { value: "padel",      label: "Pádel" },
  { value: "tenis",      label: "Tenis" },
  { value: "pickleball", label: "Pickleball" },
] as const

export const EVENT_TYPES = Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as EventType,
  label: cfg.label,
}))

export const EVENT_VISIBILITIES = [
  { value: "public",       label: "Público" },
  { value: "members_only", label: "Solo miembros" },
  { value: "private",      label: "Privado" },
] as const
