import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { TeamClientShell } from "./TeamClientShell"

export const metadata = {
  title: "Mi Team — MATCHPOINT",
}

interface TeamMemberRow {
  id: string
  user_id: string
  role: "captain" | "member"
  profile: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

interface TeamRow {
  id: string
  name: string
  sport: string
  description: string | null
  invite_code: string
  members: TeamMemberRow[]
}

async function getUserTeam(userId: string): Promise<TeamRow | null> {
  const supabase = await createClient()

  // Find team membership for this user
  const { data: membership, error: memberError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (memberError || !membership) return null

  // Fetch team with all members and their profiles
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      sport,
      description,
      invite_code,
      members:team_members (
        id,
        user_id,
        role,
        profile:profiles (
          id,
          full_name,
          username,
          avatar_url
        )
      )
    `)
    .eq("id", membership.team_id)
    .single()

  if (teamError || !team) return null

  return team as unknown as TeamRow
}

export default async function TeamPage() {
  const ctx = await authorizeOrRedirect()
  const team = await getUserTeam(ctx.userId)

  return (
    <div className="max-w-2xl">
      <TeamClientShell initialTeam={team} currentUserId={ctx.userId} />
    </div>
  )
}
