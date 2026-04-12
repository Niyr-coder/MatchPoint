// src/app/(dashboard)/dashboard/shop/sell/page.tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { SellForm } from "@/components/dashboard/shop/SellForm"
import { createServiceClient } from "@/lib/supabase/server"

export default async function SellPage() {
  const ctx = await authorizeOrRedirect()

  const supabase = createServiceClient()
  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", ctx.userId)
    .eq("is_active", true)
    .in("role", ["owner", "manager"])
    .limit(1)
    .maybeSingle()

  const isVerified = ctx.globalRole !== "user" || membership != null
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
