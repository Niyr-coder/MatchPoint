import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types"

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface ClubRequest {
  id: string
  user_id: string
  name: string
  city: string
  province: string
  description: string | null
  sports: string[]
  contact_phone: string | null
  contact_email: string | null
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const createClubRequestSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  city: z.string().min(1, "La ciudad es requerida"),
  province: z.string().min(1, "La provincia es requerida"),
  description: z.string().nullish(),
  sports: z
    .array(z.string().min(1))
    .min(1, "Debe seleccionar al menos un deporte"),
  contactPhone: z.string().nullish(),
  contactEmail: z.string().email("Email de contacto inválido").nullish(),
})

// ──────────────────────────────────────────────────────────
// GET — list the authenticated user's own requests
// ──────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse<ClubRequest[]>>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  try {
    const { data, error } = await supabase
      .from("club_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      data: (data ?? []) as ClubRequest[],
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[GET /api/club-requests]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener las solicitudes" },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// POST — create a new club request
// ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ClubRequest>>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = createClubRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  try {
    // Enforce: only one pending request per user at a time
    const { data: existing, error: checkError } = await supabase
      .from("club_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle()

    if (checkError) throw new Error(checkError.message)

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Ya tienes una solicitud pendiente. Espera a que sea revisada antes de crear otra.",
        },
        { status: 409 }
      )
    }

    const d = parsed.data
    const { data: created, error: insertError } = await supabase
      .from("club_requests")
      .insert({
        user_id: user.id,
        name: d.name.trim(),
        city: d.city.trim(),
        province: d.province.trim(),
        description: d.description ?? null,
        sports: d.sports,
        contact_phone: d.contactPhone ?? null,
        contact_email: d.contactEmail ?? null,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json(
      { success: true, data: created as ClubRequest, error: null },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/club-requests]", message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al crear la solicitud" },
      { status: 500 }
    )
  }
}
