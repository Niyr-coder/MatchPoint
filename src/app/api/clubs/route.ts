import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getClubs } from "@/features/clubs/queries/clubs"
import type { ApiResponse } from "@/types"
import type { ClubWithSports } from "@/features/clubs/queries/clubs"
import { ok, fail } from "@/lib/api/response"

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ClubWithSports[]>>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return fail("Unauthorized", 401)
    }

    const { searchParams } = request.nextUrl
    const sport = searchParams.get("sport") ?? undefined
    const province = searchParams.get("province") ?? undefined
    const search = searchParams.get("search") ?? undefined

    const clubs = await getClubs({ sport, province, search })

    return ok(clubs)
  } catch (err) {
    console.error("[GET /api/clubs]", err)
    return fail("Error al obtener clubes", 500)
  }
}
