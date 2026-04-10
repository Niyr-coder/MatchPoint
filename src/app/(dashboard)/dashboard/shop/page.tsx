import { authorizeOrRedirect } from "@/features/auth/queries"
import { createClient } from "@/lib/supabase/server"
import { ShopView } from "@/components/dashboard/ShopView"

export default async function UserShopPage() {
  const ctx = await authorizeOrRedirect()
  const supabase = await createClient()

  // Resolve user's primary active club for product filtering and order attribution
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
