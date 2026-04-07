import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCourtAvailability } from "@/features/clubs/queries/courts"

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { courtId } = await params
  const date = request.nextUrl.searchParams.get("date")

  if (!date || !DATE_REGEX.test(date)) {
    return NextResponse.json(
      { success: false, error: "Parámetro 'date' requerido en formato YYYY-MM-DD" },
      { status: 400 }
    )
  }

  const today = new Date().toISOString().split("T")[0]
  if (date < today) {
    return NextResponse.json(
      { success: false, error: "No se puede consultar disponibilidad de fechas pasadas" },
      { status: 400 }
    )
  }

  try {
    const slots = await getCourtAvailability(courtId, date)
    return NextResponse.json({ success: true, data: slots })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener disponibilidad"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
