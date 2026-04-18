import { NextRequest, NextResponse } from "next/server"
import { waitlistSchema } from "@/lib/validations"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const ip = getClientIp(request)
  const rl = await checkRateLimit("waitlist", ip, RATE_LIMITS.waitlist)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta de nuevo en un momento.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo inválido")
  }

  const result = waitlistSchema.safeParse(body)
  if (!result.success) {
    return fail(result.error.issues[0].message, 422)
  }

  const { email, source } = result.data

  const supabase = createServiceClient()

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, source })

  if (error) {
    // Unique constraint violation → already registered
    if (error.code === "23505") {
      return fail("Este email ya está registrado.", 409)
    }
    console.error("[waitlist] Supabase error:", error)
    return fail("Error interno. Intenta de nuevo.", 500)
  }

  return ok(null, 201)
}
