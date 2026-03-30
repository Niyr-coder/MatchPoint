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

  // Ownership check: verify the reservation belongs to this user
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("id, user_id")
    .eq("id", id)
    .single()

  if (fetchError || !reservation) {
    return NextResponse.json({ success: false, error: "Reserva no encontrada" }, { status: 404 })
  }

  if (reservation.user_id !== user.id) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 })
  }

  try {
    await cancelReservation(id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cancelar reserva"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
