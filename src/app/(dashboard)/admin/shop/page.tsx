import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { ShopView } from "@/components/dashboard/ShopView"

export default async function AdminShopPage() {
  const ctx = await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const supabase = await createServiceClient()

  // Admins are not bound to a specific club — pass null for club-neutral browsing
  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", ctx.userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return <ShopView userId={ctx.userId} clubId={membership?.club_id ?? null} />
}
