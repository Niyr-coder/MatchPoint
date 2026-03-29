import { NextResponse } from "next/server"
import { authorize } from "@/lib/auth/authorization"
import { getUserRoles } from "@/lib/auth/get-user-roles"
import type { ApiResponse, UserRoleEntry } from "@/types"

export async function GET(): Promise<NextResponse<ApiResponse<UserRoleEntry[]>>> {
  const result = await authorize()

  if (!result.ok) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const roles = await getUserRoles(result.context.userId)

  return NextResponse.json({ success: true, data: roles, error: null })
}
