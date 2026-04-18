import { createClient } from "@/lib/supabase/server"
import type { InviteEntityType } from "./actions"

export type JoinPreviewStatus = "valid" | "expired" | "inactive" | "exhausted" | "not_found"

export interface EntityPreviewData {
  name: string
  subtitle: string
  description: string | null
  gradient: string
  cta_text: string
  cta_sub: string | null
  stats: Array<{ label: string; value: string }>
}

export interface JoinPreview {
  code: string
  entity_type: InviteEntityType
  status: JoinPreviewStatus
  entity: EntityPreviewData
}

const GRADIENTS: Record<InviteEntityType, string> = {
  club:        "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
  tournament:  "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
  reservation: "linear-gradient(135deg, #065f46 0%, #0f172a 100%)",
  team:        "linear-gradient(135deg, #9a3412 0%, #1c1917 100%)",
  event:       "linear-gradient(135deg, #c2410c 0%, #1c1917 100%)",
  coach_class: "linear-gradient(135deg, #0369a1 0%, #0f172a 100%)",
}

const CTA_TEXTS: Record<InviteEntityType, string> = {
  club:        "Unirme al club",
  tournament:  "Inscribirme al torneo",
  reservation: "Aceptar invitación",
  team:        "Unirme al equipo",
  event:       "Registrarme al evento",
  coach_class: "Unirme a la clase",
}

const FALLBACK_ENTITY: EntityPreviewData = {
  name: "Invitación",
  subtitle: "MATCHPOINT",
  description: null,
  gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  cta_text: "Aceptar invitación",
  cta_sub: null,
  stats: [],
}

async function fetchClubEntity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
): Promise<EntityPreviewData> {
  const { data } = await supabase
    .from("clubs")
    .select("name, city, description")
    .eq("id", entityId)
    .maybeSingle()

  if (!data) return FALLBACK_ENTITY

  const club = data as { name: string; city: string | null; description: string | null }
  return {
    name: club.name,
    subtitle: club.city ?? "Ecuador",
    description: club.description,
    gradient: GRADIENTS.club,
    cta_text: CTA_TEXTS.club,
    cta_sub: null,
    stats: [],
  }
}

async function fetchTournamentEntity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
): Promise<EntityPreviewData> {
  const { data } = await supabase
    .from("tournaments")
    .select("name, start_date, end_date, max_participants, entry_fee, game_dynamic, clubs(name)")
    .eq("id", entityId)
    .maybeSingle()

  if (!data) return FALLBACK_ENTITY

  const t = data as {
    name: string
    start_date: string | null
    end_date: string | null
    max_participants: number | null
    entry_fee: number | null
    game_dynamic: string | null
    clubs: { name: string } | null
  }

  const dateRange = t.start_date
    ? new Date(t.start_date).toLocaleDateString("es-EC", { day: "numeric", month: "short" })
    : null

  return {
    name: t.name,
    subtitle: [t.clubs?.name, dateRange].filter(Boolean).join(" · "),
    description: t.game_dynamic ?? null,
    gradient: GRADIENTS.tournament,
    cta_text: CTA_TEXTS.tournament,
    cta_sub: t.max_participants ? `${t.max_participants} cupos disponibles` : null,
    stats: [
      ...(t.max_participants ? [{ label: "Cupos", value: String(t.max_participants) }] : []),
      ...(t.entry_fee ? [{ label: "Fee", value: `$${t.entry_fee}` }] : []),
      ...(t.start_date ? [{ label: "Inicio", value: dateRange ?? "" }] : []),
    ],
  }
}

async function fetchReservationEntity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
): Promise<EntityPreviewData> {
  const { data } = await supabase
    .from("reservations")
    .select("date, start_time, end_time, user_id, courts(name, sport, clubs(name)), profiles(full_name)")
    .eq("id", entityId)
    .maybeSingle()

  if (!data) return FALLBACK_ENTITY

  const r = data as {
    date: string
    start_time: string
    end_time: string
    courts: { name: string; sport: string; clubs: { name: string } | null } | null
    profiles: { full_name: string | null } | null
  }

  const dateLabel = new Date(r.date + "T12:00:00").toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

  const startH = r.start_time.slice(0, 5)
  const endH = r.end_time.slice(0, 5)

  return {
    name: "Te invitan a jugar",
    subtitle: [r.courts?.name, r.courts?.clubs?.name].filter(Boolean).join(" · "),
    description: r.profiles?.full_name ? `Invitado por ${r.profiles.full_name}` : null,
    gradient: GRADIENTS.reservation,
    cta_text: CTA_TEXTS.reservation,
    cta_sub: null,
    stats: [
      { label: "Fecha", value: dateLabel },
      { label: "Hora", value: `${startH} – ${endH}` },
      { label: "Deporte", value: r.courts?.sport ?? "" },
    ],
  }
}

export async function fetchJoinPreview(code: string): Promise<JoinPreview> {
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from("invite_links")
    .select("id, entity_type, entity_id, is_active, expires_at, uses_count, max_uses")
    .eq("code", code)
    .maybeSingle()

  const entityType: InviteEntityType = (invite?.entity_type as InviteEntityType) ?? "club"

  if (!invite) {
    return { code, entity_type: entityType, status: "not_found", entity: FALLBACK_ENTITY }
  }

  if (!invite.is_active) {
    return { code, entity_type: entityType, status: "inactive", entity: FALLBACK_ENTITY }
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { code, entity_type: entityType, status: "expired", entity: FALLBACK_ENTITY }
  }

  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return { code, entity_type: entityType, status: "exhausted", entity: FALLBACK_ENTITY }
  }

  const entityFetchers: Record<InviteEntityType, () => Promise<EntityPreviewData>> = {
    club:        () => fetchClubEntity(supabase, invite.entity_id),
    tournament:  () => fetchTournamentEntity(supabase, invite.entity_id),
    reservation: () => fetchReservationEntity(supabase, invite.entity_id),
    team:        async () => ({ ...FALLBACK_ENTITY, gradient: GRADIENTS.team, cta_text: CTA_TEXTS.team }),
    event:       async () => ({ ...FALLBACK_ENTITY, gradient: GRADIENTS.event, cta_text: CTA_TEXTS.event }),
    coach_class: async () => ({ ...FALLBACK_ENTITY, gradient: GRADIENTS.coach_class, cta_text: CTA_TEXTS.coach_class }),
  }

  const entity = await entityFetchers[entityType]()
  return { code, entity_type: entityType, status: "valid", entity }
}
