import { createServiceClient } from "@/lib/supabase/server"
import type { UserAdmin } from "./types"

export async function getAllUsersAdmin(
  filters?: { search?: string; role?: string }
): Promise<UserAdmin[]> {
  try {
    const supabase = createServiceClient()

    let query = supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, global_role, created_at, city, province, username, avatar_url, rating, matches_played, settings, is_verified, account_origin, verified_at, verified_by")
      .order("created_at", { ascending: false })

    if (filters?.role) {
      query = query.eq("global_role", filters.role)
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,username.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as UserAdmin[]
  } catch {
    return []
  }
}
