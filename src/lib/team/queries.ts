import { createServiceClient } from "@/lib/supabase/server"

export interface TeamMember {
  id: string
  userId: string
  fullName: string | null
  avatarUrl: string | null
  role: string
  phone: string | null
  isActive: boolean
  joinedAt: string
}

export interface ClientEntry {
  userId: string
  fullName: string | null
  phone: string | null
  totalReservations: number
  lastVisit: string | null
}

export async function getClubTeam(clubId: string): Promise<TeamMember[]> {
  try {
    const service = await createServiceClient()
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
    const service = await createServiceClient()

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
  const service = await createServiceClient()
  await service.from("club_members").update({ role }).eq("id", memberId)
}

export async function deactivateMember(memberId: string): Promise<void> {
  const service = await createServiceClient()
  await service.from("club_members").update({ is_active: false }).eq("id", memberId)
}

export async function getClubClients(clubId: string): Promise<ClientEntry[]> {
  try {
    const service = await createServiceClient()
    const { data, error } = await service
      .from("reservations")
      .select(`
        user_id,
        date,
        courts!inner ( club_id ),
        profiles!reservations_user_profile_fk ( full_name, phone )
      `)
      .eq("courts.club_id", clubId)

    if (error || !data) return []

    type RawClientRow = {
      user_id: string
      date: string
      profiles: Array<{ full_name: string | null; phone: string | null }>
    }

    const map = new Map<string, {
      fullName: string | null
      phone: string | null
      count: number
      lastVisit: string | null
    }>()

    for (const rawRow of data as unknown as RawClientRow[]) {
      const profileObj = Array.isArray(rawRow.profiles) ? rawRow.profiles[0] : rawRow.profiles
      const row = {
        user_id: rawRow.user_id,
        date: rawRow.date,
        profiles: profileObj as { full_name: string | null; phone: string | null } | null,
      }
      const existing = map.get(row.user_id)
      const rowDate = row.date ?? null
      if (!existing) {
        map.set(row.user_id, {
          fullName: row.profiles?.full_name ?? null,
          phone: row.profiles?.phone ?? null,
          count: 1,
          lastVisit: rowDate,
        })
      } else {
        const updated = {
          ...existing,
          count: existing.count + 1,
          lastVisit:
            rowDate && (!existing.lastVisit || rowDate > existing.lastVisit)
              ? rowDate
              : existing.lastVisit,
        }
        map.set(row.user_id, updated)
      }
    }

    return Array.from(map.entries()).map(([userId, entry]) => ({
      userId,
      fullName: entry.fullName,
      phone: entry.phone,
      totalReservations: entry.count,
      lastVisit: entry.lastVisit,
    }))
  } catch {
    return []
  }
}
