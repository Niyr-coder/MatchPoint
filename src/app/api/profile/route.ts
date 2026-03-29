import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { onboardingSchema } from "@/lib/validations"
import type { ApiResponse } from "@/types"

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  // Get authenticated user via cookie-based client
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  const supabase = await createServiceClient()
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      full_name: `${parsed.data.first_name} ${parsed.data.last_name}`,
      city: parsed.data.city,
      province: parsed.data.province,
      phone: parsed.data.phone,
      date_of_birth: parsed.data.date_of_birth,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (updateError) {
    // Unique constraint violation on username
    if (updateError.code === "23505") {
      return NextResponse.json(
        { success: false, data: null, error: "Este nombre de usuario ya está en uso." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, data: null, error: "Error al guardar el perfil. Intenta de nuevo." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
