import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ShopView } from "@/components/dashboard/ShopView"

export default async function UserShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <ShopView userId={user.id} />
}
