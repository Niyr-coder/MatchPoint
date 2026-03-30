import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatView } from "@/components/dashboard/ChatView"

export default async function UserChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <ChatView userId={user.id} />
}
