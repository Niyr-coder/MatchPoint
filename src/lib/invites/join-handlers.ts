/**
 * join-handlers.ts
 *
 * Pure functions — one per invite_entity_type — that enroll a user into the
 * entity referenced by a redeemed invite link.
 *
 * All handlers receive a service-role Supabase client so they bypass RLS.
 * Each handler is idempotent: reinserting an existing record is a no-op via
 * ON CONFLICT DO NOTHING / upsert with ignoreDuplicates.
 *
 * Schema references:
 *   club        → public.club_members      (003_roles_permissions)
 *   tournament  → public.tournament_participants (004_courts_reservations_tournaments)
 *   team        → public.team_members      (026_notifications_teams)
 *   event       → public.event_registrations (029_invite_links)
 *   coach_class → public.coach_students    (006_rankings_coach_cashregister)
 *   reservation → public.reservation_invites (004_courts_reservations_tournaments)
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type InviteEntityType =
  | "club"
  | "tournament"
  | "team"
  | "event"
  | "coach_class"
  | "reservation"

export interface InviteLink {
  id: string
  code: string
  entity_type: InviteEntityType
  entity_id: string
  created_by: string
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export type JoinHandler = (
  supabase: SupabaseClient,
  invite: InviteLink,
  userId: string
) => Promise<void>

// ──────────────────────────────────────────────────────────────────────────────
// Error messages
// ──────────────────────────────────────────────────────────────────────────────

const JOIN_ERRORS = {
  club: "Error al unirse al club",
  tournament: "Error al inscribirse en el torneo",
  team: "Error al unirse al equipo",
  event: "Error al registrarse en el evento",
  coach_class: "Error al inscribirse en la clase",
  reservation: "Error al unirse a la reserva",
} as const satisfies Record<InviteEntityType, string>

// ──────────────────────────────────────────────────────────────────────────────
// club → club_members
// role defaults to 'user'; can be overridden via invite metadata
// UNIQUE(user_id, club_id, role) — conflict is silently ignored
// ──────────────────────────────────────────────────────────────────────────────

const joinClub: JoinHandler = async (supabase, invite, userId) => {
  const role = (invite.metadata?.role as string | undefined) ?? "user"

  const { error } = await supabase
    .from("club_members")
    .upsert(
      { user_id: userId, club_id: invite.entity_id, role, is_active: true },
      { onConflict: "user_id,club_id,role", ignoreDuplicates: true }
    )

  if (error) throw new Error(`${JOIN_ERRORS.club}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// tournament → tournament_participants
// UNIQUE(tournament_id, user_id) — conflict is silently ignored
// ──────────────────────────────────────────────────────────────────────────────

const joinTournament: JoinHandler = async (supabase, invite, userId) => {
  const { error } = await supabase
    .from("tournament_participants")
    .upsert(
      { tournament_id: invite.entity_id, user_id: userId, status: "registered" },
      { onConflict: "tournament_id,user_id", ignoreDuplicates: true }
    )

  if (error) throw new Error(`${JOIN_ERRORS.tournament}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// team → team_members
// UNIQUE(team_id, user_id) — conflict is silently ignored
// New members always join as 'member' (captains are set explicitly)
// ──────────────────────────────────────────────────────────────────────────────

const joinTeam: JoinHandler = async (supabase, invite, userId) => {
  const { error } = await supabase
    .from("team_members")
    .upsert(
      { team_id: invite.entity_id, user_id: userId, role: "member" },
      { onConflict: "team_id,user_id", ignoreDuplicates: true }
    )

  if (error) throw new Error(`${JOIN_ERRORS.team}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// event → event_registrations
// UNIQUE(event_id, user_id) — conflict is silently ignored
// ──────────────────────────────────────────────────────────────────────────────

const joinEvent: JoinHandler = async (supabase, invite, userId) => {
  const { error } = await supabase
    .from("event_registrations")
    .upsert(
      { event_id: invite.entity_id, user_id: userId },
      { onConflict: "event_id,user_id", ignoreDuplicates: true }
    )

  if (error) throw new Error(`${JOIN_ERRORS.event}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// coach_class → coach_students
// entity_id is the coach's user_id (the class owner)
// metadata must carry: club_id and sport (required by the schema)
// UNIQUE(coach_user_id, student_user_id, club_id) — conflict is silently ignored
// ──────────────────────────────────────────────────────────────────────────────

const joinCoachClass: JoinHandler = async (supabase, invite, userId) => {
  const clubId = invite.metadata?.club_id as string | undefined
  const sport = invite.metadata?.sport as string | undefined

  if (!clubId || !sport) {
    throw new Error(
      "El invite de clase no contiene club_id o sport en metadata"
    )
  }

  const { error } = await supabase
    .from("coach_students")
    .upsert(
      {
        coach_user_id: invite.entity_id,
        student_user_id: userId,
        club_id: clubId,
        sport,
        is_active: true,
      },
      { onConflict: "coach_user_id,student_user_id,club_id", ignoreDuplicates: true }
    )

  if (error) throw new Error(`${JOIN_ERRORS.coach_class}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// reservation → reservation_invites
// entity_id is the reservation_id
// UNIQUE(reservation_id, invited_user_id) — conflict is silently ignored
// status starts as 'pending' per the schema default
// ──────────────────────────────────────────────────────────────────────────────

const joinReservation: JoinHandler = async (supabase, invite, userId) => {
  const { error } = await supabase
    .from("reservation_invites")
    .upsert(
      {
        reservation_id: invite.entity_id,
        invited_user_id: userId,
        status: "pending",
      },
      { onConflict: "reservation_id,invited_user_id", ignoreDuplicates: true }
    )

  if (error) throw new Error(`${JOIN_ERRORS.reservation}: ${error.message}`)
}

// ──────────────────────────────────────────────────────────────────────────────
// Registry — maps entity_type to its handler
// ──────────────────────────────────────────────────────────────────────────────

export const JOIN_HANDLER_REGISTRY: Record<InviteEntityType, JoinHandler> = {
  club: joinClub,
  tournament: joinTournament,
  team: joinTeam,
  event: joinEvent,
  coach_class: joinCoachClass,
  reservation: joinReservation,
}
