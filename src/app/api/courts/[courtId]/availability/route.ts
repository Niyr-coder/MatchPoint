import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCourtAvailability } from "@/features/clubs/queries/courts"
import { ok, fail } from "@/lib/api/response"

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  const { courtId } = await params
  const date = request.nextUrl.searchParams.get("date")

  if (!date || !DATE_REGEX.test(date)) {
    return fail("Parámetro 'date' requerido en formato YYYY-MM-DD")
  }

  const today = new Date().toISOString().split("T")[0]
  if (date < today) {
    return fail("No se puede consultar disponibilidad de fechas pasadas")
  }

  try {
    const slots = await getCourtAvailability(courtId, date)
    return ok(slots)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener disponibilidad"
    return fail(message, 500)
  }
}
