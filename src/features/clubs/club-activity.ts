import { createClient } from "@/lib/supabase/server"

export type ActivityType = "tournament_opened" | "new_member"

export interface ActivityItem {
  type: ActivityType
  title: string
  subtitle: string
  timestamp: string
  color: string
}

export async function getClubActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from("user_roles")
    .select("club_id")
    .eq("user_id", userId)
    .limit(100)

  if (!roles?.length) return []

  const clubIds = roles.map((r: { club_id: string }) => r.club_id)

  const [tournamentsRes, membersRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name, created_at, clubs(name)")
      .in("club_id", clubIds)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("club_members")
      .select("id, created_at, clubs(name), profiles(full_name)")
      .in("club_id", clubIds)
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  const items: ActivityItem[] = []

  for (const t of (tournamentsRes.data ?? []) as Array<{
    name: string
    created_at: string
    clubs: { name: string } | null
  }>) {
    items.push({
      type: "tournament_opened",
      title: `Torneo "${t.name}" abierto`,
      subtitle: t.clubs?.name ?? "",
      timestamp: t.created_at,
      color: "#10b981",
    })
  }

  for (const m of (membersRes.data ?? []) as Array<{
    created_at: string
    clubs: { name: string } | null
    profiles: { full_name: string | null } | null
  }>) {
    items.push({
      type: "new_member",
      title: `${m.profiles?.full_name ?? "Nuevo miembro"} se unió al club`,
      subtitle: m.clubs?.name ?? "",
      timestamp: m.created_at,
      color: "#6366f1",
    })
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
}
