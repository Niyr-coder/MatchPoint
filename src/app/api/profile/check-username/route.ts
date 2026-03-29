import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

const querySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
})

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<{ available: boolean }>>> {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") ?? ""

  const parsed = querySchema.safeParse({ username })
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Username inválido" },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()
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
