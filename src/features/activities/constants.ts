import type { EventStatus, EventType } from "./types"
import { VISIBLE_SPORT_OPTIONS, SPORT_LABELS as SPORT_LABELS_CONFIG } from "@/lib/sports/config"

export const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  social:      { label: "Social",      color: "text-pink-700",    bg: "bg-pink-50",    border: "border-pink-200",    description: "Encuentros informales para conectar jugadores del club." },
  clinic:      { label: "Clínica",     color: "text-[#0a0a0a]",   bg: "bg-[#f5f5f5]", border: "border-[#e5e5e5]",   description: "Sesión de entrenamiento técnico guiada por un instructor." },
  workshop:    { label: "Workshop",    color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  description: "Taller práctico sobre técnica, táctica o reglamento." },
  open_day:    { label: "Día Abierto", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", description: "Jornada abierta para conocer las instalaciones y probar el deporte." },
  exhibition:  { label: "Exhibición",  color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   description: "Partido o demostración de alto nivel para el público." },
  masterclass: { label: "Masterclass", color: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200",  description: "Clase magistral impartida por un jugador o entrenador de élite." },
  quedada:     { label: "Quedada",     color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200",  description: "Partida amistosa organizada entre jugadores del club." },
  ranking:     { label: "Ranking",     color: "text-cyan-700",    bg: "bg-cyan-50",    border: "border-cyan-200",    description: "Competición oficial que afecta el ranking de los participantes." },
  other:       { label: "Otro",        color: "text-zinc-600",    bg: "bg-zinc-100",   border: "border-zinc-200",    description: "Cualquier evento que no encaje en las categorías anteriores." },
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

// Re-exported for backwards compatibility — source of truth is @/lib/sports/config
export const SPORT_LABELS: Record<string, string> = SPORT_LABELS_CONFIG
export const SPORTS = VISIBLE_SPORT_OPTIONS

export const EVENT_TYPES = Object.entries(EVENT_TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as EventType,
  label: cfg.label,
}))

export const EVENT_VISIBILITIES = [
  { value: "public",      label: "Público" },
  { value: "club_only",   label: "Solo miembros del club" },
  { value: "invite_only", label: "Solo por invitación" },
] as const
