import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import type { ApiResponse, AppRole } from "@/types"
import { ok, fail } from "@/lib/api/response"

// ──────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  globalRole: z
    .enum(["admin", "owner", "partner", "manager", "employee", "coach", "user"], {
      message: "Rol inválido",
    })
    .default("user"),
  /** Optional club to enroll the new user into */
  clubId: z.string().uuid("ID de club inválido").optional(),
  /** Role within the club — required when clubId is provided */
  clubRole: z
    .enum(["owner", "partner", "manager", "employee", "coach", "user"], {
      message: "Rol de club inválido",
    })
    .optional(),
})

type CreateUserInput = z.infer<typeof createUserSchema>

// ──────────────────────────────────────────────────────────
// Response shape
// ──────────────────────────────────────────────────────────

interface CreatedUser {
  id: string
  email: string
  globalRole: AppRole
  clubMembershipAdded: boolean
}

// ──────────────────────────────────────────────────────────
// POST /api/admin/users/create
// ──────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CreatedUser>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return fail("No autorizado", 403)
  }

  const rl = await checkRateLimit("adminCreateUser", authResult.context.userId, RATE_LIMITS.adminCreateUser)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 422)
  }

  const input: CreateUserInput = parsed.data

  // clubRole is required when clubId is provided
  if (input.clubId && !input.clubRole) {
    return fail("Se requiere clubRole cuando se especifica clubId", 422)
  }

  const actorId = authResult.context.userId
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Step 1 — create the auth user via admin API
  // Generate a secure random password — user will always log in via Google
  const tempPassword = `MP_${crypto.randomUUID().replace(/-/g, "")}_${Date.now()}`

  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true, // admin-created accounts skip email verification
  })

  if (createError || !authData.user) {
    const message = createError?.message ?? "Error desconocido al crear el usuario"
    console.error("[POST /api/admin/users/create] auth.admin.createUser failed:", message)

    // Surface a client-friendly version of common Supabase errors
    const clientMessage = message.toLowerCase().includes("already registered")
      ? "Ya existe un usuario con ese email"
      : "Error al crear el usuario"

    return fail(clientMessage, 409)
  }

  const newUserId = authData.user.id

  try {
    // Step 2 — update the auto-created profile with extra fields
    // The profile row is created by the handle_new_user trigger; we update it here.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: input.fullName,
        global_role: input.globalRole,
        is_verified: true,
        account_origin: "admin_created",
        verified_at: now,
        verified_by: actorId,
        updated_at: now,
      })
      .eq("id", newUserId)

    if (profileError) throw new Error(profileError.message)

    // Step 3 — optionally enroll in a club
    let clubMembershipAdded = false
    if (input.clubId && input.clubRole) {
      const { error: memberError } = await supabase.from("club_members").insert({
        user_id: newUserId,
        club_id: input.clubId,
        role: input.clubRole,
        is_active: true,
        joined_at: now,
        updated_at: now,
      })

      if (memberError) {
        // Non-fatal: log the failure but don't roll back the user creation
        console.error(
          "[POST /api/admin/users/create] club_members insert failed:",
          memberError.message
        )
      } else {
        clubMembershipAdded = true
      }
    }

    // Step 4 — audit log (fire-and-forget, never throws)
    await logAdminAction({
      action: "user.created",
      entityType: "users",
      entityId: newUserId,
      actorId,
      details: {
        email: input.email,
        globalRole: input.globalRole,
        clubId: input.clubId ?? null,
        clubRole: input.clubRole ?? null,
        clubMembershipAdded,
      },
    })

    const responseData: CreatedUser = {
      id: newUserId,
      email: input.email,
      globalRole: input.globalRole as AppRole,
      clubMembershipAdded,
    }

    return ok(responseData, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[POST /api/admin/users/create]", message)

    // Best-effort cleanup: delete the auth user so the email can be reused
    await supabase.auth.admin.deleteUser(newUserId).catch((cleanupErr: unknown) => {
      const cleanupMsg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
      console.error("[POST /api/admin/users/create] cleanup deleteUser failed:", cleanupMsg)
    })

    return fail("Error al configurar el usuario creado", 500)
  }
}
