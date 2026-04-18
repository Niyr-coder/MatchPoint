import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { getUserRoles } from "@/features/memberships/queries"
import type { ApiResponse, UserRoleEntry } from "@/types"
import { ok, fail } from "@/lib/api/response"

export async function GET(): Promise<NextResponse<ApiResponse<UserRoleEntry[]>>> {
  const result = await authorize()

  if (!result.ok) {
    return fail("Unauthorized", 401)
  }

  const roles = await getUserRoles(result.context.userId)

  return ok(roles)
}
