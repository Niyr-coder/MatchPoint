import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ok, fail } from "@/lib/api/response"

// ---------------------------------------------------------------------------
// GET /api/clubs/[clubId]/members — list active members of a club
// Used by the "New chat" drawer to show who the caller can DM.
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params

  if (!clubId) {
    return fail("clubId requerido")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return fail("Unauthorized", 401)
  }

  const service = createServiceClient()

  // Verify the caller is an active member of the club before returning the list
  const { data: callerMembership, error: membershipError } = await service
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (membershipError) {
    console.error("[api/clubs/[clubId]/members] membership check failed:", membershipError.message)
    return fail("Error al verificar membresía", 500)
  }

  if (!callerMembership) {
    return fail("Forbidden", 403)
  }

  // Fetch all active members excluding the caller
  const { data: members, error: membersError } = await service
    .from("club_members")
    .select("user_id, role, profile:profiles(id, full_name, username, avatar_url)")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .neq("user_id", user.id)
    .order("user_id", { ascending: true })

  if (membersError) {
    console.error("[api/clubs/[clubId]/members] members fetch failed:", membersError.message)
    return fail("Error al obtener miembros", 500)
  }

  type ProfileRow = { id: string; full_name: string | null; username: string | null; avatar_url: string | null }

  const data = (members ?? []).map((m) => {
    // Supabase returns a single object for many-to-one joins via foreign key.
    // The generated type is an array, so we cast through unknown to access it.
    const profile = (m.profile as unknown) as ProfileRow | null
    return {
      userId: m.user_id,
      fullName: profile?.full_name ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: m.role as string,
    }
  }).sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? "", "es"))

  return ok(data)
}
