import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cancelReservation } from "@/lib/reservations/queries"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { action } = body as { action?: string }

  if (action !== "cancel") {
    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 422 })
  }

  try {
    await cancelReservation(id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cancelar reserva"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
