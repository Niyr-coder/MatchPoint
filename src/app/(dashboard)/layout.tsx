import { redirect } from "next/navigation"
import { authorize } from "@/lib/auth/authorization"
import { getUserRoles } from "@/lib/auth/get-user-roles"
import { RoleContextProvider } from "@/providers/RoleContextProvider"
import type { AuthContext } from "@/types"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await authorize()

  if (!result.ok) {
    redirect("/login")
  }

  const ctx = (result as { ok: true; context: AuthContext }).context

  if (!ctx.profile.onboarding_completed) {
    redirect("/onboarding")
  }

  const availableRoles = await getUserRoles(ctx.userId)

  return (
    <RoleContextProvider availableRoles={availableRoles}>
      {children}
    </RoleContextProvider>
  )
}
