import { createServiceClient } from "@/lib/supabase/server"
import type { UserRoleEntry } from "@/types"

interface ClubMemberRow {
  role: string
  is_active: boolean
  clubs: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  } | null
}

export async function getUserRoles(userId: string): Promise<UserRoleEntry[]> {
  const service = await createServiceClient()
  const { data, error } = await service
    .from("club_members")
    .select(`
      role,
      is_active,
      clubs (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq("user_id", userId)
    .eq("is_active", true)

  if (error || !data) return []

  return (data as unknown as ClubMemberRow[])
    .filter((m) => m.clubs !== null)
    .map((m) => ({
      clubId: m.clubs!.id,
      clubName: m.clubs!.name,
      clubSlug: m.clubs!.slug,
      clubLogo: m.clubs!.logo_url,
      role: m.role as UserRoleEntry["role"],
    }))
}
