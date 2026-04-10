import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

const PAGE_SIZE = 20

export interface ReservationAdmin {
  id: string
  user_id: string
  user_name: string | null
  user_email: string | null
  club_id: string | null
  club_name: string | null
  court_id: string
  court_name: string | null
  court_sport: string | null
  date: string
  start_time: string
  end_time: string
  status: "pending" | "confirmed" | "cancelled"
  total_price: number
  notes: string | null
  created_at: string
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ReservationAdmin[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "No autorizado" },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const clubId = searchParams.get("club_id") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const fromDate = searchParams.get("from_date") ?? undefined
  const toDate = searchParams.get("to_date") ?? undefined
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const offset = (page - 1) * PAGE_SIZE

  try {
    const supabase = createServiceClient()

    let query = supabase
      .from("reservations")
      .select(
        `
        id,
        user_id,
        date,
        start_time,
        end_time,
        status,
        total_price,
        notes,
        created_at,
        profiles:user_id (
          full_name,
          email
        ),
        courts:court_id (
          id,
          name,
          sport,
          club_id,
          clubs:club_id (
            id,
            name
          )
        )
        `,
        { count: "exact" }
      )
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (clubId) {
      // Filter by the court's club — PostgREST dot-notation for embedded relation
      query = query.eq("courts.club_id", clubId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (fromDate) {
      query = query.gte("date", fromDate)
    }

    if (toDate) {
      query = query.lte("date", toDate)
    }

    const { data, error, count } = await query

    if (error) throw new Error(error.message)

    const rows: ReservationAdmin[] = (data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const court = Array.isArray(row.courts) ? row.courts[0] : row.courts
      const club = court
        ? Array.isArray((court as { clubs?: unknown }).clubs)
          ? ((court as { clubs?: unknown[] }).clubs ?? [])[0]
          : (court as { clubs?: unknown }).clubs
        : null

      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_name: (profile as { full_name?: string | null } | null)?.full_name ?? null,
        user_email: (profile as { email?: string | null } | null)?.email ?? null,
        club_id: (club as { id?: string } | null)?.id ?? null,
        club_name: (club as { name?: string } | null)?.name ?? null,
        court_id: (court as { id?: string } | null)?.id ?? "",
        court_name: (court as { name?: string } | null)?.name ?? null,
        court_sport: (court as { sport?: string } | null)?.sport ?? null,
        date: row.date as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        status: row.status as "pending" | "confirmed" | "cancelled",
        total_price: row.total_price as number,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
      }
    })

    return NextResponse.json({
      success: true,
      data: rows,
      error: null,
      meta: {
        total: count ?? 0,
        page,
        limit: PAGE_SIZE,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/admin/reservations]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener las reservas" },
      { status: 500 }
    )
  }
}
