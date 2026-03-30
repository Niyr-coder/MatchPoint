import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ShopView } from "@/components/dashboard/ShopView"

export default async function UserShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Resolve user's primary active club for product filtering and order attribution
  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return <ShopView userId={user.id} clubId={membership?.club_id ?? null} />
}
