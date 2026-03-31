import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { ChatView } from "@/components/dashboard/ChatView"

export default async function AdminChatPage() {
  const ctx = await authorizeOrRedirect({ requiredRoles: ["admin"] })

  return <ChatView userId={ctx.userId} />
}
