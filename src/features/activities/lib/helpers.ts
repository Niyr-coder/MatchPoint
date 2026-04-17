const AVATAR_PALETTE: Array<{ bg: string; text: string }> = [
  { bg: "#e0e7ff", text: "#4338ca" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fee2e2", text: "#b91c1c" },
  { bg: "#e0f2fe", text: "#0369a1" },
]

function hashUserId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === "") return ""
  if (parts.length === 1) return (parts[0]?.[0] ?? "").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

export function attendeeColor(userId: string): { bg: string; text: string } {
  return AVATAR_PALETTE[hashUserId(userId) % AVATAR_PALETTE.length]!
}
