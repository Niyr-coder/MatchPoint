import type { AppRole } from "@/features/auth/types"

export interface RoleContext {
  clubId: string | null
  clubRole: AppRole
  clubName: string | null
  clubLogo: string | null
}

export interface UserRoleEntry {
  clubId: string
  clubName: string
  clubSlug: string
  clubLogo: string | null
  role: AppRole
}
