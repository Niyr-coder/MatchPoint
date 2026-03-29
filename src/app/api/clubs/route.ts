import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getClubs } from "@/lib/clubs/queries"
import type { ApiResponse } from "@/types"
import type { ClubWithSports } from "@/lib/clubs/queries"

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ClubWithSports[]>>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl
    const sport = searchParams.get("sport") ?? undefined
    const province = searchParams.get("province") ?? undefined
    const search = searchParams.get("search") ?? undefined

    const clubs = await getClubs({ sport, province, search })

    return NextResponse.json({ success: true, data: clubs, error: null })
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener clubes" },
      { status: 500 }
    )
  }
}
