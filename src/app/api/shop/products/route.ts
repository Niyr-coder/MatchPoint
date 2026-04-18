import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { ok, fail } from "@/lib/api/response"

const getProductsSchema = z.object({
  category: z.enum(["equipment", "membership", "class", "other"]).optional(),
  clubId: z.string().uuid("clubId debe ser un UUID válido").optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = getProductsSchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    clubId: searchParams.get("clubId") ?? undefined,
  })
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }
  const { category, clubId } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail("Unauthorized", 401)

  let query = supabase.from("products").select("*").eq("is_active", true)
  if (category) query = query.eq("category", category)
  if (clubId) query = query.eq("club_id", clubId)

  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) return fail(error.message, 500)
  return ok(data ?? [])
}

const createProductSchema = z.object({
  club_id: z.string().uuid("club_id inválido"),
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(1000).optional(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  category: z.enum(["equipment", "membership", "class", "other"]),
  stock: z.number().int().min(-1, "Stock mínimo es -1 (ilimitado)"),
  image_url: z.string().url("URL inválida").refine(url => url.startsWith("https://"), { message: "Solo se permiten URLs HTTPS" }).optional().or(z.literal("")),
})

export async function POST(request: Request) {
  const rl = await checkRateLimit("shopProductCreate", getClientIp(request), RATE_LIMITS.shopProductCreate)
  if (!rl.allowed) {
    return fail("Demasiadas solicitudes. Intenta de nuevo más tarde.", 429)
  }

  const auth = await authorize()
  if (!auth.ok) {
    return fail("No autorizado", 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("Cuerpo de solicitud inválido")
  }

  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { club_id, name, description, price, category, stock, image_url } = parsed.data
  const { userId, globalRole } = auth.context

  const supabaseCheck = createServiceClient()
  const { data: membership } = await supabaseCheck
    .from("club_members")
    .select("role")
    .eq("club_id", club_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle()

  const isPrivileged =
    globalRole === "admin" ||
    (membership != null && ["owner", "manager"].includes(membership.role))

  const approval_status = isPrivileged ? "approved" : "pending_approval"
  const is_active = approval_status === "approved"

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("products")
    .insert({
      club_id,
      name,
      description: description ?? null,
      price,
      category,
      stock,
      image_url: image_url || null,
      is_active,
      approval_status,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[POST /api/shop/products] insert error:", error)
    return fail("Error al crear producto", 500)
  }

  return ok({ id: data.id }, 201)
}
