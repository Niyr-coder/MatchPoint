import { authorizeOrRedirect } from "@/features/auth/queries"
import { ChatView } from "@/components/dashboard/ChatView"

export default async function UserChatPage() {
  const ctx = await authorizeOrRedirect()

  return <ChatView userId={ctx.userId} />
}
