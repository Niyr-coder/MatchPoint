# Shop Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the shop feature with product CRUD + approval flow, order status management with payment proof, user order history UI, and in-app notifications.

**Architecture:** Extend existing shop structure directly — new API routes under `/api/shop/products/[id]` and `/api/shop/orders/[id]`, new pages under `/dashboard/club/[id]/shop/` for owners/managers, and UI extensions to existing `/dashboard/shop` and `/admin/shop` pages.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase (PostgreSQL + RLS) · Zod · shadcn/ui (`@base-ui/react`) · Tailwind CSS 4

**Working directory:** `.worktrees/feature/shop-management`

---

## File Map

### New files to create

| File | Responsibility |
|------|---------------|
| `supabase/migrations/019_shop_extensions.sql` | Add `proof_url`, `pending_proof` status, `approval_status` to products |
| `src/app/api/shop/products/[id]/route.ts` | PUT + DELETE single product |
| `src/app/api/shop/products/route.ts` | Add POST (create product) |
| `src/app/api/shop/products/[id]/approve/route.ts` | POST approve/reject pending product (ADMIN) |
| `src/app/api/shop/orders/[id]/route.ts` | PUT status transition + GET single order |
| `src/app/api/shop/orders/[id]/proof/route.ts` | PUT payment proof URL |
| `src/app/(dashboard)/dashboard/club/[id]/shop/page.tsx` | Club shop hub (owner/manager) |
| `src/app/(dashboard)/dashboard/club/[id]/shop/products/page.tsx` | Product list for club |
| `src/app/(dashboard)/dashboard/club/[id]/shop/products/new/page.tsx` | Create product form page |
| `src/app/(dashboard)/dashboard/club/[id]/shop/products/[productId]/edit/page.tsx` | Edit product form page |
| `src/app/(dashboard)/dashboard/club/[id]/shop/orders/page.tsx` | Order management for club |
| `src/app/(dashboard)/dashboard/shop/sell/page.tsx` | User product submission form |
| `src/components/dashboard/club/shop/ProductForm.tsx` | Reusable create/edit product form |
| `src/components/dashboard/club/shop/ClubProductsView.tsx` | Club product list with actions |
| `src/components/dashboard/club/shop/ClubOrdersView.tsx` | Club order management table |
| `src/components/dashboard/shop/UserOrdersView.tsx` | User order history + proof upload |
| `src/components/dashboard/shop/SellForm.tsx` | User product submission form |

### Files to modify

| File | Change |
|------|--------|
| `src/app/api/shop/products/route.ts` | Add POST handler |
| `src/app/api/admin/shop/route.ts` | Add pending products tab + proof URL + status action support |
| `src/components/dashboard/ShopView.tsx` | Add "Mis Pedidos" tab |
| `src/components/admin/AdminShopView.tsx` | Add pending tab, proof column, status action buttons |

---

## Task 1: DB Migration — Shop Extensions

**Files:**
- Create: `supabase/migrations/019_shop_extensions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/019_shop_extensions.sql

-- 1. Add payment proof URL to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 2. Extend orders.status to include pending_proof
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_proof', 'confirmed', 'delivered', 'cancelled'));

-- 3. Add approval_status to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));

-- 4. Add created_by to products (for tracking who submitted)
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Update RLS: pending/rejected products only visible to admin and creator
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

CREATE POLICY "Anyone can view approved active products" ON products
  FOR SELECT USING (
    is_active = true AND approval_status = 'approved'
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND global_role = 'admin'
    )
  );

-- 6. Owners/managers can insert products for their club
CREATE POLICY "Club staff can insert products" ON products
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 7. Creator and club staff and admin can update their products
CREATE POLICY "Club staff and admin can update products" ON products
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM club_members
      WHERE club_id = products.club_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager')
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND global_role = 'admin'
    )
  );
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db push
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 3: Verify columns exist**

```bash
npx supabase db diff
```

Expected: No drift (migration fully applied).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/019_shop_extensions.sql
git commit -m "feat(db): extend shop tables — proof_url, pending_proof status, product approval_status"
```

---

## Task 2: API — Create Product (POST /api/shop/products)

**Files:**
- Modify: `src/app/api/shop/products/route.ts`

- [ ] **Step 1: Read current file**

```bash
cat src/app/api/shop/products/route.ts
```

- [ ] **Step 2: Add POST handler**

Add after the existing GET export:

```typescript
const createProductSchema = z.object({
  club_id: z.string().uuid("club_id inválido"),
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(1000).optional(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  category: z.enum(["equipment", "membership", "class", "other"]),
  stock: z.number().int().min(-1, "Stock mínimo es -1 (ilimitado)"),
  image_url: z.string().url("URL inválida").optional().or(z.literal("")),
})

export async function POST(request: Request) {
  const auth = await authorize()
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { club_id, name, description, price, category, stock, image_url } = parsed.data
  const { userId, globalRole } = auth.context

  // Determine approval_status based on role
  const isPrivileged =
    globalRole === "admin" ||
    (await (async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", club_id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single()
      return data && ["owner", "manager"].includes(data.role)
    })())

  // Check if user is verified (has is_verified flag or similar — for now: privileged users publish directly)
  // Non-privileged users get pending_approval
  const approval_status = isPrivileged ? "approved" : "pending_approval"
  const is_active = approval_status === "approved"

  const supabase = await createClient()
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
    console.error("Error creating product:", error)
    return NextResponse.json({ success: false, data: null, error: "Error al crear producto" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { id: data.id }, error: null }, { status: 201 })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shop/products/route.ts
git commit -m "feat(api): add POST /api/shop/products with approval flow"
```

---

## Task 3: API — Edit & Archive Product (PUT/DELETE /api/shop/products/[id])

**Files:**
- Create: `src/app/api/shop/products/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shop/products/[id]/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().min(0).optional(),
  category: z.enum(["equipment", "membership", "class", "other"]).optional(),
  stock: z.number().int().min(-1).optional(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
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
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 401 })
  }

  const { userId, globalRole } = auth.context
  const { allowed } = await canManageProduct(userId, globalRole, id)
  if (!allowed) {
    return NextResponse.json({ success: false, data: null, error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates[key] = value === "" ? null : value
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("products").update(updates).eq("id", id)

  if (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ success: false, data: null, error: "Error al actualizar" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 401 })
  }

  const { userId, globalRole } = auth.context
  const { allowed } = await canManageProduct(userId, globalRole, id)
  if (!allowed) {
    return NextResponse.json({ success: false, data: null, error: "Sin permisos" }, { status: 403 })
  }

  // Soft delete — archive instead of hard delete
  const supabase = await createClient()
  const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id)

  if (error) {
    console.error("Error archiving product:", error)
    return NextResponse.json({ success: false, data: null, error: "Error al archivar" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/products/[id]/route.ts
git commit -m "feat(api): add PUT/DELETE /api/shop/products/[id] — edit and archive products"
```

---

## Task 4: API — Approve/Reject Product (POST /api/shop/products/[id]/approve)

**Files:**
- Create: `src/app/api/shop/products/[id]/approve/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shop/products/[id]/approve/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"

const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize({ requiredRoles: ["admin"] })
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "Solo administradores" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = approveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "action debe ser approve o reject" },
      { status: 400 }
    )
  }

  const { action } = parsed.data
  const supabase = createServiceClient()

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("id, name, created_by, approval_status")
    .eq("id", id)
    .single()

  if (fetchError || !product) {
    return NextResponse.json({ success: false, data: null, error: "Producto no encontrado" }, { status: 404 })
  }

  const newApprovalStatus = action === "approve" ? "approved" : "rejected"
  const newIsActive = action === "approve"

  const { error: updateError } = await supabase
    .from("products")
    .update({ approval_status: newApprovalStatus, is_active: newIsActive })
    .eq("id", id)

  if (updateError) {
    console.error("Error updating product approval:", updateError)
    return NextResponse.json({ success: false, data: null, error: "Error al procesar" }, { status: 500 })
  }

  // Notify the product creator
  if (product.created_by) {
    await broadcastNotificationToAll({
      type: action === "approve" ? "product_approved" : "product_rejected",
      title: action === "approve" ? "Producto aprobado" : "Producto rechazado",
      body: action === "approve"
        ? `Tu producto "${product.name}" fue aprobado y ya está disponible en la tienda.`
        : `Tu producto "${product.name}" fue rechazado. Contacta al administrador para más detalles.`,
      metadata: { product_id: id },
    })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/products/[id]/approve/route.ts
git commit -m "feat(api): add POST /api/shop/products/[id]/approve — admin product approval"
```

---

## Task 5: API — Order Status Transitions (PUT /api/shop/orders/[id])

**Files:**
- Create: `src/app/api/shop/orders/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shop/orders/[id]/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"

const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "delivered", "cancelled"]),
})

type OrderStatus = "pending" | "pending_proof" | "confirmed" | "delivered" | "cancelled"

function canTransition(from: OrderStatus, to: string, role: string): boolean {
  if (role === "admin") return true
  if ((role === "owner" || role === "manager")) {
    if (from === "pending_proof" && (to === "confirmed" || to === "cancelled")) return true
    if (from === "confirmed" && to === "delivered") return true
    if (from === "pending" && to === "cancelled") return true
  }
  return false
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { status: newStatus } = parsed.data
  const { userId, globalRole } = auth.context
  const supabase = createServiceClient()

  // Fetch order with club info
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id, club_id")
    .eq("id", id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ success: false, data: null, error: "Orden no encontrada" }, { status: 404 })
  }

  // Determine effective role for this club
  let effectiveRole = globalRole
  if (globalRole !== "admin" && order.club_id) {
    const { data: membership } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", order.club_id)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single()

    if (!membership) {
      return NextResponse.json({ success: false, data: null, error: "Sin permisos para esta orden" }, { status: 403 })
    }
    effectiveRole = membership.role
  }

  if (!canTransition(order.status as OrderStatus, newStatus, effectiveRole)) {
    return NextResponse.json(
      { success: false, data: null, error: `No se puede cambiar de '${order.status}' a '${newStatus}'` },
      { status: 422 }
    )
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", id)

  if (updateError) {
    console.error("Error updating order status:", updateError)
    return NextResponse.json({ success: false, data: null, error: "Error al actualizar" }, { status: 500 })
  }

  // Notify the buyer
  const notificationMap: Record<string, { title: string; body: string; type: string }> = {
    confirmed: {
      type: "order_confirmed",
      title: "Pedido confirmado",
      body: "Tu pago fue recibido y tu pedido está confirmado.",
    },
    cancelled: {
      type: "order_cancelled",
      title: "Pedido cancelado",
      body: "Tu pedido fue cancelado. Contacta al club si tienes dudas.",
    },
    delivered: {
      type: "order_delivered",
      title: "Pedido entregado",
      body: "Tu pedido ha sido marcado como entregado.",
    },
  }

  if (notificationMap[newStatus]) {
    await broadcastNotificationToAll({
      ...notificationMap[newStatus],
      metadata: { order_id: id },
    })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/orders/[id]/route.ts
git commit -m "feat(api): add PUT /api/shop/orders/[id] — order status transitions with notifications"
```

---

## Task 6: API — Payment Proof (PUT /api/shop/orders/[id]/proof)

**Files:**
- Create: `src/app/api/shop/orders/[id]/proof/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shop/orders/[id]/proof/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { broadcastNotificationToAll } from "@/features/notifications/utils"

const proofSchema = z.object({
  proof_url: z.string().url("Debe ser una URL válida"),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await authorize()
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = proofSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { userId } = auth.context
  const supabase = await createClient()

  // Fetch order — user must own it and it must be in 'pending' status
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, user_id, club_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ success: false, data: null, error: "Orden no encontrada" }, { status: 404 })
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { success: false, data: null, error: "Solo puedes subir comprobante en órdenes pendientes" },
      { status: 422 }
    )
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ proof_url: parsed.data.proof_url, status: "pending_proof" })
    .eq("id", id)

  if (updateError) {
    console.error("Error updating proof:", updateError)
    return NextResponse.json({ success: false, data: null, error: "Error al guardar comprobante" }, { status: 500 })
  }

  // Notify club staff
  if (order.club_id) {
    await broadcastNotificationToAll({
      type: "order_proof_submitted",
      title: "Comprobante recibido",
      body: "Un cliente subió su comprobante de pago. Revisa y confirma la orden.",
      metadata: { order_id: id, club_id: order.club_id },
    })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/orders/[id]/proof/route.ts
git commit -m "feat(api): add PUT /api/shop/orders/[id]/proof — payment proof submission"
```

---

## Task 7: Component — ProductForm (reusable create/edit form)

**Files:**
- Create: `src/components/dashboard/club/shop/ProductForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/dashboard/club/shop/ProductForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ProductCategory = "equipment" | "membership" | "class" | "other"

interface ProductFormProps {
  clubId: string
  initialValues?: {
    name: string
    description: string
    price: number
    category: ProductCategory
    stock: number
    image_url: string
    is_active: boolean
  }
  productId?: string // if editing
  onSuccess?: () => void
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  equipment: "Equipamiento",
  membership: "Membresía",
  class: "Clase",
  other: "Otro",
}

const DEFAULT_VALUES = {
  name: "",
  description: "",
  price: 0,
  category: "equipment" as ProductCategory,
  stock: -1,
  image_url: "",
  is_active: true,
}

export function ProductForm({ clubId, initialValues, productId, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const [values, setValues] = useState(initialValues ?? DEFAULT_VALUES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const url = productId ? `/api/shop/products/${productId}` : "/api/shop/products"
    const method = productId ? "PUT" : "POST"
    const body = productId ? values : { ...values, club_id: clubId }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok || !json.success) {
      setError(json.error ?? "Error al guardar")
      return
    }

    if (onSuccess) {
      onSuccess()
    } else {
      router.push(`/dashboard/club/${clubId}/shop/products`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Nombre *</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          required
          maxLength={200}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="Nombre del producto"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Descripción</label>
        <textarea
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          placeholder="Descripción opcional"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Precio (USD) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={values.price}
            onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
            required
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Stock (-1 = ilimitado) *</label>
          <input
            type="number"
            min={-1}
            value={values.stock}
            onChange={(e) => update("stock", parseInt(e.target.value) || -1)}
            required
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Categoría *</label>
        <select
          value={values.category}
          onChange={(e) => update("category", e.target.value as ProductCategory)}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
        >
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">URL de imagen (opcional)</label>
        <input
          type="url"
          value={values.image_url}
          onChange={(e) => update("image_url", e.target.value)}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="https://..."
        />
      </div>

      {productId && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={values.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Producto activo (visible en tienda)</label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-zinc-200 rounded-lg py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : productId ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/club/shop/ProductForm.tsx
git commit -m "feat(ui): add reusable ProductForm component"
```

---

## Task 8: API — Club Products Endpoint (GET /api/shop/club/[clubId]/products)

**Files:**
- Create: `src/app/api/shop/club/[clubId]/products/route.ts`

This endpoint allows owners/managers to fetch ALL products of their club (including inactive and pending), unlike the public products endpoint which only shows approved active products.

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/shop/club/[clubId]/products/route.ts
import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params
  const auth = await authorize({ clubId, requiredRoles: ["owner", "manager"] })
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "Sin permisos" }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, category, stock, is_active, approval_status, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching club products:", error)
    return NextResponse.json({ success: false, data: null, error: "Error al cargar" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [], error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/club/
git commit -m "feat(api): add GET /api/shop/club/[clubId]/products for owner/manager"
```

---

## Task 8b: API — Club Orders Endpoint (GET /api/shop/club/[clubId]/orders)

**Files:**
- Create: `src/app/api/shop/club/[clubId]/orders/route.ts`

This endpoint allows owners/managers to fetch all orders of their club. The admin endpoint requires `admin` role, so owners/managers need their own scoped endpoint.

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/shop/club/[clubId]/orders/route.ts
import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params
  const auth = await authorize({ clubId, requiredRoles: ["owner", "manager"] })
  if (!auth.ok) {
    return NextResponse.json({ success: false, data: null, error: "Sin permisos" }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  const supabase = createServiceClient()
  const { data, count, error } = await supabase
    .from("orders")
    .select(
      `id, total, status, proof_url, created_at,
       profiles!user_id(full_name, email),
       order_items(product_name, quantity, unit_price)`,
      { count: "exact" }
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    console.error("Error fetching club orders:", error)
    return NextResponse.json({ success: false, data: null, error: "Error al cargar" }, { status: 500 })
  }

  const orders = (data ?? []).map((o: any) => ({
    id: o.id,
    user_name: o.profiles?.full_name ?? "—",
    user_email: o.profiles?.email ?? "—",
    total: o.total,
    status: o.status,
    proof_url: o.proof_url,
    created_at: o.created_at,
    items: o.order_items ?? [],
  }))

  return NextResponse.json({
    success: true,
    data: { orders, meta: { total: count ?? 0, page, limit: PAGE_SIZE } },
    error: null,
  })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/club/
git commit -m "feat(api): add GET /api/shop/club/[clubId]/orders for owner/manager"
```

---

## Task 9: Component — ClubProductsView

**Files:**
- Create: `src/components/dashboard/club/shop/ClubProductsView.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/dashboard/club/shop/ClubProductsView.tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  is_active: boolean
  approval_status: string
  created_at: string
}

interface ClubProductsViewProps {
  clubId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  equipment: "Equipamiento",
  membership: "Membresía",
  class: "Clase",
  other: "Otro",
}

const APPROVAL_BADGES: Record<string, { label: string; className: string }> = {
  approved: { label: "Activo", className: "bg-green-100 text-green-700" },
  pending_approval: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "Rechazado", className: "bg-red-100 text-red-700" },
}

const fmt = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })

export function ClubProductsView({ clubId }: ClubProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, startTransition] = useTransition()
  const [archiving, setArchiving] = useState<string | null>(null)

  function load() {
    startTransition(async () => {
      // Uses club-scoped endpoint (requires owner/manager role)
      const res = await fetch(`/api/shop/club/${clubId}/products`)
      const json = await res.json()
      if (json.success) setProducts(json.data ?? [])
    })
  }

  useEffect(() => { load() }, [clubId])

  async function archive(productId: string) {
    if (!confirm("¿Archivar este producto? Dejará de aparecer en la tienda.")) return
    setArchiving(productId)
    await fetch(`/api/shop/products/${productId}`, { method: "DELETE" })
    setArchiving(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Productos del club</h2>
        <Link
          href={`/dashboard/club/${clubId}/shop/products/new`}
          className="bg-zinc-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      {loading && <p className="text-sm text-zinc-500">Cargando...</p>}

      {!loading && products.length === 0 && (
        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <p className="text-zinc-500 text-sm">No hay productos aún.</p>
          <Link
            href={`/dashboard/club/${clubId}/shop/products/new`}
            className="text-sm text-zinc-900 font-medium underline mt-2 inline-block"
          >
            Crea el primero
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-700">Precio</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-700">Stock</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => {
                const badge = APPROVAL_BADGES[p.approval_status] ?? APPROVAL_BADGES.approved
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td className="px-4 py-3 text-right text-zinc-900">{fmt.format(p.price)}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {p.stock === -1 ? "Ilimitado" : p.stock}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/dashboard/club/${clubId}/shop/products/${p.id}/edit`}
                        className="text-xs text-zinc-600 hover:text-zinc-900 underline"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => archive(p.id)}
                        disabled={archiving === p.id}
                        className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
                      >
                        {archiving === p.id ? "..." : "Archivar"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/club/shop/ClubProductsView.tsx
git commit -m "feat(ui): add ClubProductsView component"
```

---

## Task 10: Component — ClubOrdersView

**Files:**
- Create: `src/components/dashboard/club/shop/ClubOrdersView.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/dashboard/club/shop/ClubOrdersView.tsx
"use client"

import { useEffect, useState, useTransition } from "react"

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  user_name: string
  user_email: string
  total: number
  status: string
  proof_url: string | null
  created_at: string
  items: OrderItem[]
}

interface ClubOrdersViewProps {
  clubId: string
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending:       { label: "Pendiente",        className: "bg-zinc-100 text-zinc-700" },
  pending_proof: { label: "Comprobante",       className: "bg-yellow-100 text-yellow-700" },
  confirmed:     { label: "Confirmado",        className: "bg-blue-100 text-blue-700" },
  delivered:     { label: "Entregado",         className: "bg-green-100 text-green-700" },
  cancelled:     { label: "Cancelado",         className: "bg-red-100 text-red-700" },
}

const fmt = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })

type TargetStatus = "confirmed" | "cancelled" | "delivered"

export function ClubOrdersView({ clubId }: ClubOrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, startTransition] = useTransition()
  const [acting, setActing] = useState<string | null>(null)

  function load() {
    startTransition(async () => {
      // Uses club-scoped endpoint (requires owner/manager role, not admin)
      const res = await fetch(`/api/shop/club/${clubId}/orders`)
      const json = await res.json()
      if (json.success) setOrders(json.data?.orders ?? [])
    })
  }

  useEffect(() => { load() }, [clubId])

  async function changeStatus(orderId: string, status: TargetStatus) {
    setActing(orderId)
    await fetch(`/api/shop/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setActing(null)
    load()
  }

  function getActions(order: Order): { label: string; status: TargetStatus; variant: "confirm" | "cancel" | "deliver" }[] {
    if (order.status === "pending_proof") {
      return [
        { label: "Confirmar", status: "confirmed", variant: "confirm" },
        { label: "Rechazar", status: "cancelled", variant: "cancel" },
      ]
    }
    if (order.status === "confirmed") {
      return [{ label: "Marcar entregado", status: "delivered", variant: "deliver" }]
    }
    if (order.status === "pending") {
      return [{ label: "Cancelar", status: "cancelled", variant: "cancel" }]
    }
    return []
  }

  const BUTTON_CLASSES: Record<string, string> = {
    confirm: "text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 transition-colors",
    cancel:  "text-xs border border-red-200 text-red-600 rounded px-2 py-1 hover:bg-red-50 transition-colors",
    deliver: "text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 transition-colors",
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Órdenes del club</h2>

      {loading && <p className="text-sm text-zinc-500">Cargando...</p>}

      {!loading && orders.length === 0 && (
        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <p className="text-zinc-500 text-sm">No hay órdenes aún.</p>
        </div>
      )}

      {orders.length > 0 && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Productos</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-700">Total</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Comprobante</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => {
                const badge = STATUS_BADGES[o.status] ?? STATUS_BADGES.pending
                const actions = getActions(o)
                return (
                  <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{o.user_name}</div>
                      <div className="text-xs text-zinc-500">{o.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {o.items?.map((item) => `${item.product_name} ×${item.quantity}`).join(", ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{fmt.format(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.proof_url ? (
                        <a href={o.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                          Ver
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {actions.map((action) => (
                          <button
                            key={action.status}
                            onClick={() => changeStatus(o.id, action.status)}
                            disabled={acting === o.id}
                            className={BUTTON_CLASSES[action.variant]}
                          >
                            {acting === o.id ? "..." : action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/club/shop/ClubOrdersView.tsx
git commit -m "feat(ui): add ClubOrdersView component with status transitions"
```

---

## Task 11: Component — UserOrdersView (historial + comprobante)

**Files:**
- Create: `src/components/dashboard/shop/UserOrdersView.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/dashboard/shop/UserOrdersView.tsx
"use client"

import { useEffect, useState, useTransition } from "react"

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
}

interface UserOrder {
  id: string
  total: number
  status: string
  proof_url: string | null
  created_at: string
  order_items: OrderItem[]
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending:       { label: "Pendiente pago",   className: "bg-zinc-100 text-zinc-600" },
  pending_proof: { label: "En revisión",      className: "bg-yellow-100 text-yellow-700" },
  confirmed:     { label: "Confirmado",       className: "bg-blue-100 text-blue-700" },
  delivered:     { label: "Entregado",        className: "bg-green-100 text-green-700" },
  cancelled:     { label: "Cancelado",        className: "bg-red-100 text-red-700" },
}

const fmt = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })

export function UserOrdersView() {
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [loading, startTransition] = useTransition()
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  function load() {
    startTransition(async () => {
      const res = await fetch("/api/shop/orders")
      const json = await res.json()
      if (json.success) setOrders(json.data ?? [])
    })
  }

  useEffect(() => { load() }, [])

  async function submitProof(orderId: string) {
    const url = proofInputs[orderId]?.trim()
    if (!url) return
    setSubmitting(orderId)
    setProofError(null)

    const res = await fetch(`/api/shop/orders/${orderId}/proof`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof_url: url }),
    })

    const json = await res.json()
    setSubmitting(null)

    if (!res.ok || !json.success) {
      setProofError(json.error ?? "Error al enviar comprobante")
      return
    }

    setProofInputs((prev) => ({ ...prev, [orderId]: "" }))
    load()
  }

  if (loading) return <p className="text-sm text-zinc-500 py-8 text-center">Cargando pedidos...</p>

  if (orders.length === 0) {
    return (
      <div className="border border-zinc-200 rounded-lg p-8 text-center">
        <p className="text-zinc-500 text-sm">No tienes pedidos aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {proofError && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {proofError}
        </div>
      )}

      {orders.map((order) => {
        const badge = STATUS_BADGES[order.status] ?? STATUS_BADGES.pending
        return (
          <div key={order.id} className="border border-zinc-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">{fmtDate(order.created_at)}</p>
                <p className="font-semibold text-zinc-900">{fmt.format(order.total)}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            <ul className="text-sm text-zinc-600 space-y-0.5">
              {order.order_items.map((item, i) => (
                <li key={i}>
                  {item.product_name} × {item.quantity} — {fmt.format(item.unit_price * item.quantity)}
                </li>
              ))}
            </ul>

            {order.status === "pending" && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-zinc-500">
                  Pega aquí la URL de tu comprobante de pago (captura, Google Drive, etc.)
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={proofInputs[order.id] ?? ""}
                    onChange={(e) =>
                      setProofInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                    }
                    placeholder="https://..."
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    onClick={() => submitProof(order.id)}
                    disabled={submitting === order.id || !proofInputs[order.id]?.trim()}
                    className="bg-zinc-900 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {submitting === order.id ? "..." : "Enviar"}
                  </button>
                </div>
              </div>
            )}

            {order.proof_url && order.status !== "pending" && (
              <p className="text-xs text-zinc-500">
                Comprobante enviado:{" "}
                <a href={order.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  ver
                </a>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/shop/UserOrdersView.tsx
git commit -m "feat(ui): add UserOrdersView with order history and proof upload"
```

---

## Task 12: Pages — Club Shop Hub & Products

**Files:**
- Create: `src/app/(dashboard)/dashboard/club/[id]/shop/page.tsx`
- Create: `src/app/(dashboard)/dashboard/club/[id]/shop/products/page.tsx`
- Create: `src/app/(dashboard)/dashboard/club/[id]/shop/products/new/page.tsx`
- Create: `src/app/(dashboard)/dashboard/club/[id]/shop/products/[productId]/edit/page.tsx`
- Create: `src/app/(dashboard)/dashboard/club/[id]/shop/orders/page.tsx`

- [ ] **Step 1: Create shop hub page**

```typescript
// src/app/(dashboard)/dashboard/club/[id]/shop/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function ClubShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tienda del club</h1>
        <p className="text-zinc-500 text-sm mt-1">Gestiona productos y órdenes de tu club.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          href={`/dashboard/club/${clubId}/shop/products`}
          className="border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 transition-colors group"
        >
          <div className="text-2xl mb-2">📦</div>
          <h2 className="font-semibold text-zinc-900 group-hover:text-zinc-700">Productos</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Crear, editar y archivar productos</p>
        </Link>

        <Link
          href={`/dashboard/club/${clubId}/shop/orders`}
          className="border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 transition-colors group"
        >
          <div className="text-2xl mb-2">🧾</div>
          <h2 className="font-semibold text-zinc-900 group-hover:text-zinc-700">Órdenes</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Revisar comprobantes y confirmar pedidos</p>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create products list page**

```typescript
// src/app/(dashboard)/dashboard/club/[id]/shop/products/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubProductsView } from "@/components/dashboard/club/shop/ClubProductsView"

export default async function ClubProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <ClubProductsView clubId={clubId} />
    </div>
  )
}
```

- [ ] **Step 3: Create new product page**

```typescript
// src/app/(dashboard)/dashboard/club/[id]/shop/products/new/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ProductForm } from "@/components/dashboard/club/shop/ProductForm"

export default async function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Nuevo producto</h1>
        <p className="text-zinc-500 text-sm mt-1">El producto quedará activo de inmediato.</p>
      </div>
      <ProductForm clubId={clubId} />
    </div>
  )
}
```

- [ ] **Step 4: Create edit product page**

```typescript
// src/app/(dashboard)/dashboard/club/[id]/shop/products/[productId]/edit/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ProductForm } from "@/components/dashboard/club/shop/ProductForm"
import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>
}) {
  const { id: clubId, productId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  const supabase = createServiceClient()
  const { data: product } = await supabase
    .from("products")
    .select("name, description, price, category, stock, image_url, is_active")
    .eq("id", productId)
    .eq("club_id", clubId)
    .single()

  if (!product) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Editar producto</h1>
      </div>
      <ProductForm
        clubId={clubId}
        productId={productId}
        initialValues={{
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          category: product.category as "equipment" | "membership" | "class" | "other",
          stock: product.stock,
          image_url: product.image_url ?? "",
          is_active: product.is_active,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create orders page**

```typescript
// src/app/(dashboard)/dashboard/club/[id]/shop/orders/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { ClubOrdersView } from "@/components/dashboard/club/shop/ClubOrdersView"

export default async function ClubOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner", "manager"] })

  return (
    <div className="space-y-6">
      <ClubOrdersView clubId={clubId} />
    </div>
  )
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/club/
git commit -m "feat(pages): add club shop hub — products and orders management pages"
```

---

## Task 13: Page — User Shop with "Mis Pedidos" Tab

**Files:**
- Modify: `src/components/dashboard/ShopView.tsx`

- [ ] **Step 1: Add "Mis Pedidos" tab**

Read the current ShopView and add a tab switcher. Add at the top of the component (after the existing state):

```typescript
const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog")
```

Wrap the existing product catalog JSX in `{activeTab === "catalog" && (...)}` and add a tab bar above it:

```tsx
{/* Tab bar */}
<div className="flex border-b border-zinc-200 mb-4">
  {(["catalog", "orders"] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab
          ? "border-zinc-900 text-zinc-900"
          : "border-transparent text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {tab === "catalog" ? "Catálogo" : "Mis Pedidos"}
    </button>
  ))}
</div>

{/* Orders tab */}
{activeTab === "orders" && <UserOrdersView />}
```

Add import at top:
```typescript
import { UserOrdersView } from "@/components/dashboard/shop/UserOrdersView"
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ShopView.tsx src/components/dashboard/shop/UserOrdersView.tsx
git commit -m "feat(ui): add Mis Pedidos tab to ShopView"
```

---

## Task 14: User Sell Form (product submission for regular users)

**Files:**
- Create: `src/components/dashboard/shop/SellForm.tsx`
- Create: `src/app/(dashboard)/dashboard/shop/sell/page.tsx`

- [ ] **Step 1: Create SellForm component**

```typescript
// src/components/dashboard/shop/SellForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ProductCategory = "equipment" | "membership" | "class" | "other"

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  equipment: "Equipamiento",
  membership: "Membresía",
  class: "Clase",
  other: "Otro",
}

interface SellFormProps {
  clubId: string
  isVerified: boolean
}

export function SellForm({ clubId, isVerified }: SellFormProps) {
  const router = useRouter()
  const [values, setValues] = useState({
    name: "",
    description: "",
    price: 0,
    category: "equipment" as ProductCategory,
    stock: -1,
    image_url: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, club_id: clubId }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok || !json.success) {
      setError(json.error ?? "Error al enviar")
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-center space-y-2">
        <p className="text-green-700 font-semibold">
          {isVerified ? "¡Producto publicado!" : "¡Producto enviado para revisión!"}
        </p>
        <p className="text-sm text-green-600">
          {isVerified
            ? "Tu producto ya está disponible en la tienda."
            : "Un administrador revisará tu producto pronto."}
        </p>
        <button
          onClick={() => router.push("/dashboard/shop")}
          className="text-sm text-green-700 underline"
        >
          Ir a la tienda
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg">
      {!isVerified && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
          Tu producto será revisado por un administrador antes de publicarse.
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Nombre *</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
            maxLength={200}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="Nombre del producto"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Descripción</label>
          <textarea
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Precio (USD) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={values.price}
              onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
              required
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Categoría *</label>
            <select
              value={values.category}
              onChange={(e) => update("category", e.target.value as ProductCategory)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
            >
              {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">URL de imagen (opcional)</label>
          <input
            type="url"
            value={values.image_url}
            onChange={(e) => update("image_url", e.target.value)}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Publicar producto"}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create sell page**

```typescript
// src/app/(dashboard)/dashboard/shop/sell/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { SellForm } from "@/components/dashboard/shop/SellForm"
import { createServiceClient } from "@/lib/supabase/server"

export default async function SellPage() {
  const ctx = await authorizeOrRedirect()

  // Determine if user is verified (global_role set, or is owner/manager in any club)
  const supabase = createServiceClient()
  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", ctx.userId)
    .eq("is_active", true)
    .in("role", ["owner", "manager"])
    .limit(1)
    .maybeSingle()

  const isVerified =
    ctx.globalRole !== "user" || membership != null

  const clubId = membership?.club_id ?? null

  if (!clubId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900">Vender un producto</h1>
        <p className="text-zinc-500 text-sm">Debes pertenecer a un club para publicar productos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Vender un producto</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {isVerified
            ? "Tu producto se publicará de inmediato."
            : "Tu producto será revisado antes de publicarse."}
        </p>
      </div>
      <SellForm clubId={clubId} isVerified={isVerified} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/shop/SellForm.tsx src/app/\(dashboard\)/dashboard/shop/sell/page.tsx
git commit -m "feat(ui): add user product submission form and /dashboard/shop/sell page"
```

---

## Task 15: Admin Shop — Pending Products Tab + Proof Column

**Files:**
- Modify: `src/components/admin/AdminShopView.tsx`
- Modify: `src/app/api/admin/shop/route.ts`

- [ ] **Step 1: Extend admin API to return pending products**

In `src/app/api/admin/shop/route.ts`, add a new query branch for `type=pending`:

```typescript
// Add to GET handler, after existing type checks:
if (type === "pending") {
  const { data: pendingProducts, count, error } = await supabase
    .from("products")
    .select(
      `id, name, description, price, stock, category, approval_status, created_at,
       clubs!inner(name),
       profiles!created_by(full_name, email)`,
      { count: "exact" }
    )
    .eq("approval_status", "pending_approval")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    console.error("Error fetching pending products:", error)
    return NextResponse.json(
      { success: false, data: null, error: "Error al cargar productos pendientes" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      pendingProducts: (pendingProducts ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        category: p.category,
        club_name: p.clubs?.name ?? "—",
        submitter_name: p.profiles?.full_name ?? "—",
        submitter_email: p.profiles?.email ?? "—",
        created_at: p.created_at,
      })),
      stats: {
        total_revenue: 0, // Stats are only shown in the full orders/products views; pending tab doesn't need them
        pending_orders: 0,
        active_products: 0,
      },
      meta: { total: count ?? 0, page, limit: PAGE_SIZE },
    },
    error: null,
  })
}
```

- [ ] **Step 2: Add "Pendientes" tab to AdminShopView**

In `src/components/admin/AdminShopView.tsx`, add a third tab "Pendientes" that:
- Fetches `/api/admin/shop?type=pending`
- Shows a table with: nombre, club, precio, categoría, enviado por, fecha
- Each row has "Aprobar" and "Rechazar" buttons that call `POST /api/shop/products/[id]/approve`

Add state:
```typescript
const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([])
const [pendingTotal, setPendingTotal] = useState(0)
const [pendingLoading, startPendingTransition] = useTransition()
const [approving, setApproving] = useState<string | null>(null)
```

Add type:
```typescript
interface PendingProduct {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  category: string
  club_name: string
  submitter_name: string
  submitter_email: string
  created_at: string
}
```

Add fetch function:
```typescript
function fetchPending() {
  startPendingTransition(async () => {
    const res = await fetch("/api/admin/shop?type=pending")
    const json = await res.json()
    if (json.success) {
      setPendingProducts(json.data?.pendingProducts ?? [])
      setPendingTotal(json.data?.meta?.total ?? 0)
    }
  })
}
```

Add approve/reject handler:
```typescript
async function handleApproval(productId: string, action: "approve" | "reject") {
  setApproving(productId)
  await fetch(`/api/shop/products/${productId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  })
  setApproving(null)
  fetchPending()
}
```

Add "Pendientes" tab button alongside existing Orders/Products tabs and a table in the tab panel.

- [ ] **Step 3: Add proof_url column to admin orders table**

In the existing orders table in `AdminShopView.tsx`, add a "Comprobante" column after Status:
```tsx
<th className="text-left px-4 py-3 font-medium text-zinc-700">Comprobante</th>
// In each row:
<td className="px-4 py-3">
  {order.proof_url ? (
    <a href={order.proof_url} target="_blank" rel="noopener noreferrer"
       className="text-xs text-blue-600 underline">Ver</a>
  ) : <span className="text-xs text-zinc-400">—</span>}
</td>
```

Update `AdminOrder` type to include `proof_url: string | null`.
Update the admin orders query in `/api/admin/shop/route.ts` to select `proof_url` from orders.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminShopView.tsx src/app/api/admin/shop/route.ts
git commit -m "feat(admin): add pending products tab and proof_url column to shop admin"
```

---

## Task 16: Extend GET /api/shop/orders to include proof_url

**Files:**
- Modify: `src/app/api/shop/orders/route.ts`

- [ ] **Step 1: Check current GET query includes order_items**

The current GET already fetches `order_items` nested. Verify the select includes `proof_url`:

In the GET handler, update the select to include `proof_url`:

```typescript
const { data: orders, error } = await supabase
  .from("orders")
  .select(`
    id,
    total,
    status,
    proof_url,
    created_at,
    order_items (
      product_name,
      quantity,
      unit_price
    )
  `)
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(50)
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shop/orders/route.ts
git commit -m "feat(api): include proof_url and order_items in GET /api/shop/orders"
```

---

## Task 17: Notification for New Orders to Club Staff

**Files:**
- Modify: `src/app/api/shop/orders/route.ts`

- [ ] **Step 1: Add notification after order creation**

In the POST handler of `/api/shop/orders/route.ts`, after the successful RPC call, add:

```typescript
import { broadcastNotificationToAll } from "@/features/notifications/utils"

// After: return NextResponse.json({ success: true, data: { orderId } ... })
// Before the return, fire notification:
await broadcastNotificationToAll({
  type: "new_order",
  title: "Nuevo pedido recibido",
  body: "Un cliente ha realizado un pedido en tu tienda. Espera el comprobante de pago.",
  metadata: { order_id: rpcResult.order_id, club_id: clubId },
})
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Full build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shop/orders/route.ts
git commit -m "feat(notifications): notify club staff on new order"
```

---

## Task 18: Final Integration Check & PR

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build succeeds.

- [ ] **Step 3: Verify all routes exist**

```bash
find src/app -name "*.tsx" | grep -E "shop" | sort
```

Expected output includes:
```
src/app/(dashboard)/admin/shop/page.tsx
src/app/(dashboard)/dashboard/club/[id]/shop/orders/page.tsx
src/app/(dashboard)/dashboard/club/[id]/shop/page.tsx
src/app/(dashboard)/dashboard/club/[id]/shop/products/[productId]/edit/page.tsx
src/app/(dashboard)/dashboard/club/[id]/shop/products/new/page.tsx
src/app/(dashboard)/dashboard/club/[id]/shop/products/page.tsx
src/app/(dashboard)/dashboard/shop/page.tsx
src/app/(dashboard)/dashboard/shop/sell/page.tsx
```

- [ ] **Step 4: Create PR**

```bash
git push -u origin feature/shop-management
gh pr create \
  --title "feat: complete shop management — product CRUD, order flow, user history" \
  --body "## Summary
- Product CRUD for owners/managers with approval flow for regular users
- Order status transitions (pending → pending_proof → confirmed → delivered/cancelled)
- Payment proof URL submission by buyers
- User order history tab in /dashboard/shop
- Club owner/manager shop panel at /dashboard/club/[id]/shop/
- Admin pending products moderation tab
- In-app notifications for all key events

## DB Changes
- Migration 019: \`proof_url\` on orders, \`pending_proof\` status, \`approval_status\` on products

## Test Plan
- [ ] OWNER can create a product → appears in store immediately
- [ ] Regular user submits product → appears in admin Pendientes tab
- [ ] ADMIN approves product → product appears in store; user gets notification
- [ ] User places order → OWNER gets new-order notification
- [ ] User submits proof URL → status changes to pending_proof; OWNER gets notification
- [ ] OWNER confirms order → user gets confirmed notification
- [ ] OWNER marks delivered → user gets delivered notification
- [ ] User sees full order history in Mis Pedidos tab"
```
