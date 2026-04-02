/**
 * POST /api/invites/redeem
 *
 * Atomically validates an invite code (via the `redeem_invite` RPC),
 * then runs the appropriate join handler to enroll the user in the entity.
 *
 * Rate limit: 10 attempts per hour per user (anti-brute-force).
 *
 * RPC error mapping:
 *   invite_not_found  → 404
 *   invite_inactive   → 410
 *   invite_expired    → 410
 *   invite_exhausted  → 410
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { JOIN_HANDLER_REGISTRY } from "@/lib/invites/join-handlers"
import type { ApiResponse } from "@/types"
import type { InviteLink, InviteEntityType } from "@/lib/invites/join-handlers"

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_REDEEM = { limit: 10, windowMs: 60 * 60 * 1_000 } as const

/** Human-readable messages for RPC-level invite errors */
const RPC_ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  invite_not_found: { message: "El código de invitación no existe",          status: 404 },
  invite_inactive:  { message: "Esta invitación ha sido desactivada",        status: 410 },
  invite_expired:   { message: "Esta invitación ha expirado",                status: 410 },
  invite_exhausted: { message: "Esta invitación ha alcanzado su límite de usos", status: 410 },
}

// ──────────────────────────────────────────────────────────────────────────────
// Success messages per entity type
// ──────────────────────────────────────────────────────────────────────────────

const SUCCESS_MESSAGES: Record<InviteEntityType, string> = {
  club:        "Te has unido al club correctamente",
  tournament:  "Te has inscrito en el torneo correctamente",
  team:        "Te has unido al equipo correctamente",
  event:       "Te has registrado en el evento correctamente",
  coach_class: "Te has inscrito en la clase correctamente",
  reservation: "Has sido añadido a la reserva correctamente",
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────────────────────────

const redeemSchema = z.object({
  code: z.string().min(1, "El código no puede estar vacío").max(64),
})

// ──────────────────────────────────────────────────────────────────────────────
// Response type
// ──────────────────────────────────────────────────────────────────────────────

interface RedeemResult {
  entity_type: InviteEntityType
  entity_id: string
  message: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: parse the PostgreSQL exception name from a Supabase error
// The RPC raises exceptions whose names appear in error.message or error.code.
// ──────────────────────────────────────────────────────────────────────────────

function extractRpcErrorName(err: unknown): string | null {
  if (err == null || typeof err !== "object") return null

  const asRecord = err as Record<string, unknown>

  // Supabase error.message carries the RAISE EXCEPTION message literal
  const message = typeof asRecord.message === "string" ? asRecord.message : ""
  // error.code is the SQLSTATE (e.g. P0001 for raise_exception)
  // Check known names directly in the message field
  for (const name of Object.keys(RPC_ERROR_MESSAGES)) {
    if (message.includes(name)) return name
  }

  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/invites/redeem
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RedeemResult>>> {
  // 1. Authenticate
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "No autenticado" },
      { status: 401 }
    )
  }

  // 2. Rate limit — keyed by userId to prevent brute force across IPs
  const rl = await checkRateLimit("invites_redeem", user.id, RATE_LIMIT_REDEEM)

  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      }
    )
  }

  // 3. Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    )
  }

  const parsed = redeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 422 }
    )
  }

  const { code } = parsed.data

  // 4. Call the atomic RPC — validates + increments uses_count in one transaction
  const service = createServiceClient()

  const { data: rpcData, error: rpcError } = await service.rpc("redeem_invite", {
    p_code: code,
  })

  if (rpcError) {
    const knownName = extractRpcErrorName(rpcError)

    if (knownName && knownName in RPC_ERROR_MESSAGES) {
      const mapped = RPC_ERROR_MESSAGES[knownName]
      return NextResponse.json(
        { success: false, data: null, error: mapped.message },
        { status: mapped.status }
      )
    }

    // Unknown DB error — log but don't expose internals
    console.error("[POST /api/invites/redeem] RPC error:", rpcError.message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al procesar la invitación" },
      { status: 500 }
    )
  }

  const invite = rpcData as InviteLink

  // 5. Run the entity-specific join handler
  const handler = JOIN_HANDLER_REGISTRY[invite.entity_type]

  if (!handler) {
    console.error("[POST /api/invites/redeem] No handler for entity_type:", invite.entity_type)
    return NextResponse.json(
      { success: false, data: null, error: "Tipo de invitación no soportado" },
      { status: 422 }
    )
  }

  try {
    await handler(service, invite, user.id)
  } catch (err) {
    // The join failed — the RPC already incremented uses_count but the user
    // was not actually enrolled. Log with detail so ops can investigate.
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[POST /api/invites/redeem] join handler failed (entity_type=${invite.entity_type}, entity_id=${invite.entity_id}, userId=${user.id}):`,
      message
    )
    return NextResponse.json(
      { success: false, data: null, error: "No se pudo completar la unión a la entidad" },
      { status: 500 }
    )
  }

  // 6. Return success
  const result: RedeemResult = {
    entity_type: invite.entity_type,
    entity_id:   invite.entity_id,
    message:     SUCCESS_MESSAGES[invite.entity_type],
  }

  return NextResponse.json({ success: true, data: result, error: null })
}
