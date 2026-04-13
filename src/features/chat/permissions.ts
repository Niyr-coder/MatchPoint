const BROADCAST_ROLES = ["admin", "owner", "manager"] as const

type BroadcastRole = (typeof BROADCAST_ROLES)[number]

export function canBroadcast(role: string | null): boolean {
  return BROADCAST_ROLES.includes(role as BroadcastRole)
}

