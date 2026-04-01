import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface JoinedMembership {
  id: string
  team_id: string
  user_id: string
  role: "member"
  joined_at: string
}

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .min(1, "El código de invitación es requerido")
    .max(64, "Código de invitación inválido"),
})

// ──────────────────────────────────────────────────────────
// POST — join a team by invite code
// ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<JoinedMembership>>> {
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

  const parsed = joinTeamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { inviteCode } = parsed.data

  try {
    // Step 1 — resolve the team by invite code; verify it exists and is active
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, is_active")
      .eq("invite_code", inviteCode)
      .maybeSingle()

    if (teamError) throw new Error(teamError.message)

    if (!team) {
      return NextResponse.json(
        { success: false, data: null, error: "Código de invitación inválido o expirado" },
        { status: 404 }
      )
    }

    if (!team.is_active) {
      return NextResponse.json(
        { success: false, data: null, error: "Este equipo ya no está activo" },
        { status: 409 }
      )
    }

    // Step 2 — check the user is not already a member
    const { data: existing, error: existingError } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", team.id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    if (existing) {
      return NextResponse.json(
        { success: false, data: null, error: "Ya eres miembro de este equipo" },
        { status: 409 }
      )
    }

    // Step 3 — insert the membership
    const { data: membership, error: insertError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: "member",
      })
      .select("id, team_id, user_id, role, joined_at")
      .single()

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json(
      { success: true, data: membership as JoinedMembership, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/teams/join]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al unirse al equipo" },
      { status: 500 }
    )
  }
}
