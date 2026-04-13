import { createServiceClient } from "@/lib/supabase/server"
import type { AdminModerationData, ClubRequestAdmin } from "./types"

export async function getClubRequestsAdmin(
  status?: "pending" | "approved" | "rejected"
): Promise<ClubRequestAdmin[]> {
  try {
    const supabase = createServiceClient()

    let query = supabase
      .from("club_requests")
      .select(
        "id, user_id, name, city, province, description, sports, contact_phone, contact_email, status, admin_notes, reviewed_by, reviewed_at, created_at, updated_at, profiles!club_requests_user_id_fkey(full_name, username)"
      )
      .order("created_at", { ascending: false })
      .limit(200)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map((row) => {
      const profile = row.profiles as { full_name?: string | null; username?: string | null } | null
      return {
        id: row.id,
        user_id: row.user_id,
        requester_name: profile?.full_name ?? null,
        requester_username: profile?.username ?? null,
        name: row.name,
        city: row.city,
        province: row.province,
        description: row.description ?? null,
        sports: row.sports ?? [],
        contact_phone: row.contact_phone ?? null,
        contact_email: row.contact_email ?? null,
        status: row.status as ClubRequestAdmin["status"],
        admin_notes: row.admin_notes ?? null,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
  } catch {
    return []
  }
}

// ---- getAdminModerationData ----------------------------------------

export async function getAdminModerationData(): Promise<AdminModerationData> {
  const EMPTY: AdminModerationData = { pendingClubs: [], recentUsers: [], inactiveClubs: [] }

  try {
    const supabase = createServiceClient()

    const [inactiveClubsRes, recentUsersRes, ownersRes] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, name, city, province, created_at")
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("id, full_name, username, global_role, created_at, city")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("club_members")
        .select("club_id, user_id, profiles(full_name)")
        .eq("role", "owner")
        .eq("is_active", true),
    ])

    const ownerByClub: Record<string, string | null> = {}
    for (const o of ownersRes.data ?? []) {
      ownerByClub[o.club_id] = (o.profiles as { full_name?: string | null } | null)?.full_name ?? null
    }

    const inactiveClubs = inactiveClubsRes.data ?? []

    const pendingClubs = inactiveClubs.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      province: c.province,
      created_at: c.created_at,
      owner_name: ownerByClub[c.id] ?? null,
    }))

    const inactiveClubsShort = inactiveClubs.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      created_at: c.created_at,
    }))

    const recentUsers = (recentUsersRes.data ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      username: u.username ?? null,
      global_role: u.global_role,
      created_at: u.created_at,
      city: u.city,
    }))

    return { pendingClubs, recentUsers, inactiveClubs: inactiveClubsShort }
  } catch {
    return EMPTY
  }
}
