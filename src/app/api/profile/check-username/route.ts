import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"

const querySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
})

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<{ available: boolean }>>> {
  // Require auth to prevent username enumeration by unauthenticated users
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkRateLimit("profileCheckUsername", user.id, RATE_LIMITS.profileCheckUsername)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") ?? ""

  const parsed = querySchema.safeParse({ username })
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Username inválido" },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { success: false, data: null, error: "Error al verificar disponibilidad" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { available: data === null },
    error: null,
  })
}
