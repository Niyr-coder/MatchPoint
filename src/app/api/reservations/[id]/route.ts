import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { cancelReservation } from "@/features/bookings/queries"
import { ok, fail } from "@/lib/api/response"

const patchSchema = z.object({
  action: z.string().refine((v) => v === "cancel", { message: "Acción no válida. Usa 'cancel'." }),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return fail("Unauthorized", 401)
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("JSON inválido")
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }
  const { action } = parsed.data

  if (action !== "cancel") {
    return fail("Acción no válida", 422)
  }

  // Ownership check: verify the reservation belongs to this user
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("id, user_id")
    .eq("id", id)
    .single()

  if (fetchError || !reservation) {
    return fail("Reserva no encontrada", 404)
  }

  if (reservation.user_id !== user.id) {
    return fail("No autorizado", 403)
  }

  try {
    await cancelReservation(id)
    return ok(null)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cancelar reserva"
    return fail(message, 500)
  }
}
