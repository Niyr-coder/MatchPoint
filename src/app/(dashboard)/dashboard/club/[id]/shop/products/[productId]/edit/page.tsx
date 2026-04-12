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
