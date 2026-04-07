import { createServiceClient } from "@/lib/supabase/server"
import type { Club } from "@/features/clubs/types"

export interface ClubWithSports extends Club {
  sports: string[]
}

export interface ClubFilters {
  sport?: string
  province?: string
  search?: string
}

export async function getClubs(filters?: ClubFilters): Promise<ClubWithSports[]> {
  try {
    const supabase = await createServiceClient()

    let query = supabase
      .from("clubs")
      .select("*, courts(sport)")
      .eq("is_active", true)
      .order("name")

    if (filters?.province) {
      query = query.eq("province", filters.province)
    }

    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) return []

    const clubs = (data ?? []).map((row) => {
      const rawSports: string[] = (row.courts ?? [])
        .map((c: { sport: string }) => c.sport)
        .filter(Boolean)
      const uniqueSports = [...new Set(rawSports)]

      const { courts: _courts, ...clubFields } = row

      return {
        ...(clubFields as Club),
        sports: uniqueSports,
      }
    })

    if (filters?.sport) {
      return clubs.filter((c) => c.sports.includes(filters.sport!))
    }

    return clubs
  } catch {
    return []
  }
}

export async function getDistinctProvinces(): Promise<string[]> {
  try {
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from("clubs")
      .select("province")
      .eq("is_active", true)
      .not("province", "is", null)
      .order("province")

    if (error) return []

    const provinces = (data ?? [])
      .map((row) => row.province as string)
      .filter(Boolean)

    return [...new Set(provinces)]
  } catch {
    return []
  }
}
