import { createServiceClient } from "@/lib/supabase/server"
import type { TournamentAdmin } from "./types"

// ---- getAllTournamentsAdmin -----------------------------------------

export async function getAllTournamentsAdmin(): Promise<TournamentAdmin[]> {
  try {
    const supabase = createServiceClient()

    const [tournamentsRes, participantsRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, name, sport, status, entry_fee, max_participants, start_date, end_date, created_at, modality, clubs(name)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("tournament_participants").select("tournament_id"),
    ])

    const participantCount: Record<string, number> = {}
    for (const p of participantsRes.data ?? []) {
      participantCount[p.tournament_id] = (participantCount[p.tournament_id] ?? 0) + 1
    }

    return (tournamentsRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      status: t.status,
      entry_fee: Number(t.entry_fee) || 0,
      max_participants: t.max_participants,
      participant_count: participantCount[t.id] ?? 0,
      start_date: t.start_date,
      end_date: t.end_date ?? null,
      club_name: (t.clubs as { name?: string } | null)?.name ?? null,
      created_at: t.created_at,
      modality: t.modality ?? null,
    }))
  } catch {
    return []
  }
}
