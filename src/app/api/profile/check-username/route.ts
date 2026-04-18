import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse } from "@/types"
import { ok, fail } from "@/lib/api/response"

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
    return fail("Unauthorized", 401)
  }

  const rl = await checkRateLimit("profileCheckUsername", user.id, RATE_LIMITS.profileCheckUsername)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") ?? ""

  const parsed = querySchema.safeParse({ username })
  if (!parsed.success) {
    return fail("Username inválido")
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle()

  if (error) {
    return fail("Error al verificar disponibilidad", 500)
  }

  return ok({ available: data === null })
}
