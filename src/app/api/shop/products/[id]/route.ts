import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0).optional(),
  category: z.enum(["equipment", "membership", "class", "other"]).optional(),
  stock: z.number().int().min(-1).optional(),
  image_url: z.string().url().refine(url => url.startsWith("https://"), { message: "Solo se permiten URLs HTTPS" }).optional().nullable().or(z.literal("")),
  is_active: z.boolean().optional(),
})

async function canManageProduct(userId: string, globalRole: string, productId: string) {
  const supabase = createServiceClient()
  const { data: product } = await supabase
    .from("products")
    .select("club_id, created_by")
    .eq("id", productId)
    .single()

  if (!product) return { allowed: false, product: null }
  if (globalRole === "admin") return { allowed: true, product }
  if (product.created_by === userId) return { allowed: true, product }

  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", product.club_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single()

  const allowed = membership != null && ["owner", "manager"].includes(membership.role)
  return { allowed, product }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return fail("No autorizado", 401)
  }

  const { userId, globalRole } = auth.context

  const rl = await checkRateLimit("shopProductUpdate", userId, RATE_LIMITS.shopProductUpdate)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta más tarde.", 429)
  }

  const { allowed } = await canManageProduct(userId, globalRole, id)
  if (!allowed) {
    return fail("Sin permisos", 403)
  }

  const body = await request.json()
  const parsed = updateProductSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value === "" ? null : value
    }
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from("products").update(updates).eq("id", id)

  if (error) {
    console.error("Error updating product:", error)
    return fail("Error al actualizar", 500)
  }

  return ok(null)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return fail("No autorizado", 401)
  }

  const { userId, globalRole } = auth.context
  const { allowed } = await canManageProduct(userId, globalRole, id)
  if (!allowed) {
    return fail("Sin permisos", 403)
  }

  // Soft delete — archive instead of hard delete
  const supabase = createServiceClient()
  const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id)

  if (error) {
    console.error("Error archiving product:", error)
    return fail("Error al archivar", 500)
  }

  return ok(null)
}
