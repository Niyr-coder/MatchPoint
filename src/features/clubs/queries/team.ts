import { createServiceClient } from "@/lib/supabase/server"
import type { ClubTeamMember, ClientEntry } from "@/features/clubs/types"

export type { ClubTeamMember, ClientEntry } from "@/features/clubs/types"
// Backwards-compat alias
export type { ClubTeamMember as TeamMember } from "@/features/clubs/types"

export async function getClubTeam(clubId: string): Promise<ClubTeamMember[]> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from("club_members")
      .select(`
        id,
        user_id,
        role,
        is_active,
        joined_at,
        profiles!club_members_user_profile_fk (
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq("club_id", clubId)
      .neq("role", "user")
      .order("joined_at", { ascending: false })

    if (error || !data) return []

    type RawRow = {
      id: string
      user_id: string
      role: string
      is_active: boolean
      joined_at: string
      profiles: Array<{ full_name: string | null; avatar_url: string | null; phone: string | null }>
    }

    return (data as unknown as RawRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id,
        userId: row.user_id,
        fullName: (profile as { full_name: string | null } | null)?.full_name ?? null,
        avatarUrl: (profile as { avatar_url: string | null } | null)?.avatar_url ?? null,
        role: row.role,
        phone: (profile as { phone: string | null } | null)?.phone ?? null,
        isActive: row.is_active,
        joinedAt: row.joined_at,
      }
    })
  } catch {
    return []
  }
}

export async function addTeamMemberByUserId(
  clubId: string,
  userId: string,
  role: string
): Promise<{ error?: string }> {
  try {
    const service = createServiceClient()

    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (!profile) return { error: "user_not_found" }

    const { error } = await service.from("club_members").insert({
      club_id: clubId,
      user_id: userId,
      role,
      is_active: true,
    })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "unknown_error" }
  }
}

export async function updateMemberRole(memberId: string, role: string): Promise<void> {
  const service = createServiceClient()
  await service.from("club_members").update({ role }).eq("id", memberId)
}

export async function deactivateMember(memberId: string): Promise<void> {
  const service = createServiceClient()
  await service.from("club_members").update({ is_active: false }).eq("id", memberId)
}

export async function getClubClients(clubId: string): Promise<ClientEntry[]> {
  try {
    const service = createServiceClient()
    // SQL COUNT/GROUP BY via RPC — replaces full table scan + JS aggregation (Q6)
    const { data, error } = await service.rpc("get_club_clients", { p_club_id: clubId })
    if (error || !data) return []

    return (data as Array<{
      user_id: string
      full_name: string | null
      phone: string | null
      total_reservations: number
      last_visit: string | null
    }>).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      phone: row.phone,
      totalReservations: row.total_reservations,
      lastVisit: row.last_visit,
    }))
  } catch {
    return []
  }
}
