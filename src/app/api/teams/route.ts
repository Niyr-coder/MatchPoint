import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { SPORT_IDS } from "@/lib/sports/config"
import type { ApiResponse } from "@/types"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface TeamMemberProfile {
  id: string
  user_id: string
  role: "captain" | "member"
  joined_at: string
  profiles: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

interface TeamWithMembers {
  id: string
  name: string
  description: string | null
  sport: string | null
  club_id: string | null
  created_by: string
  invite_code: string
  is_active: boolean
  created_at: string
  updated_at: string
  members: TeamMemberProfile[]
}

interface CreatedTeam {
  id: string
  name: string
  description: string | null
  sport: string | null
  club_id: string | null
  created_by: string
  invite_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  sport: z.enum(SPORT_IDS).nullish(),
  description: z.string().max(500).nullish(),
})

// ──────────────────────────────────────────────────────────
// GET — return the authenticated user's team (if any)
// Fetches the team the user belongs to, with all members and their profiles.
// If the user belongs to multiple teams, returns the most recently joined one.
// ──────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse<TeamWithMembers | null>>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  try {
    // Find the most recent team membership for this user
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, joined_at")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membershipError) throw new Error(membershipError.message)

    if (!membership) {
      return NextResponse.json({ success: true, data: null, error: null })
    }

    // Fetch the team row
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, description, sport, club_id, created_by, invite_code, is_active, created_at, updated_at")
      .eq("id", membership.team_id)
      .maybeSingle()

    if (teamError) throw new Error(teamError.message)
    if (!team) {
      return NextResponse.json({ success: true, data: null, error: null })
    }

    // Fetch all members of this team with their profiles
    const { data: membersRaw, error: membersError } = await supabase
      .from("team_members")
      .select(
        "id, user_id, role, joined_at, profiles!team_members_user_id_fkey(id, full_name, username, avatar_url)"
      )
      .eq("team_id", team.id)
      .order("joined_at", { ascending: true })

    if (membersError) throw new Error(membersError.message)

    const members: TeamMemberProfile[] = (membersRaw ?? []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role as "captain" | "member",
      joined_at: m.joined_at,
      profiles: ((Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as TeamMemberProfile["profiles"]) ?? null,
    }))

    const result: TeamWithMembers = {
      id: team.id,
      name: team.name,
      description: team.description ?? null,
      sport: team.sport ?? null,
      club_id: team.club_id ?? null,
      created_by: team.created_by,
      invite_code: team.invite_code,
      is_active: team.is_active,
      created_at: team.created_at,
      updated_at: team.updated_at,
      members,
    }

    return NextResponse.json({ success: true, data: result, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/teams]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener el equipo" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// POST — create a new team; the creator becomes captain
// ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreatedTeam>>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = createTeamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { name, sport, description } = parsed.data

  try {
    // Insert the team
    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        description: description ?? null,
        sport: sport ?? null,
        created_by: user.id,
      })
      .select("id, name, description, sport, club_id, created_by, invite_code, is_active, created_at, updated_at")
      .single()

    if (teamError) throw new Error(teamError.message)

    // Insert the creator as captain
    const { error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: "captain",
      })

    if (memberError) throw new Error(memberError.message)

    return NextResponse.json(
      { success: true, data: newTeam as CreatedTeam, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/teams]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear el equipo" },
      { status: 500 }
    )
  }
}
