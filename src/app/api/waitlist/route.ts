import { NextRequest, NextResponse } from "next/server"
import { waitlistSchema } from "@/lib/validations"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Cuerpo inválido" }, { status: 400 })
  }

  const result = waitlistSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, data: null, error: result.error.issues[0].message },
      { status: 422 }
    )
  }

  const { email, source } = result.data

  const supabase = await createServiceClient()

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, source })

  if (error) {
    // Unique constraint violation → already registered
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, data: null, error: "Este email ya está registrado." },
        { status: 409 }
      )
    }
    console.error("[waitlist] Supabase error:", error)
    return NextResponse.json(
      { success: false, data: null, error: "Error interno. Intenta de nuevo." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, data: null, error: null }, { status: 201 })
}
