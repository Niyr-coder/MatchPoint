import { createServiceClient } from "@/lib/supabase/server"
import type { Club } from "@/types"
import type { ClubAdmin } from "./types"

export async function getAllClubsAdmin(
  filters?: { search?: string; province?: string }
): Promise<ClubAdmin[]> {
  try {
    const supabase = createServiceClient()

    let query = supabase
      .from("clubs")
      .select("*")
      .order("created_at", { ascending: false })

    if (filters?.province) {
      query = query.eq("province", filters.province)
    }

    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }

    const { data: clubs, error } = await query
    if (error) throw new Error(error.message)
    if (!clubs || clubs.length === 0) return []

    const clubIds = clubs.map((c: Club) => c.id)

    const [membersRes, courtsRes] = await Promise.all([
      supabase
        .from("club_members")
        .select("club_id")
        .in("club_id", clubIds)
        .eq("is_active", true),
      supabase
        .from("courts")
        .select("club_id")
        .in("club_id", clubIds)
        .eq("is_active", true),
    ])

    const membersCount: Record<string, number> = {}
    const courtsCount: Record<string, number> = {}

    for (const m of membersRes.data ?? []) {
      const key = m.club_id as string
      membersCount[key] = (membersCount[key] ?? 0) + 1
    }

    for (const c of courtsRes.data ?? []) {
      const key = c.club_id as string
      courtsCount[key] = (courtsCount[key] ?? 0) + 1
    }

    return clubs.map((club: Club) => ({
      ...club,
      members_count: membersCount[club.id] ?? 0,
      courts_count: courtsCount[club.id] ?? 0,
    }))
  } catch {
    return []
  }
}
