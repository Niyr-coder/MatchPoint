import type { UserAdmin } from "@/lib/admin/queries"

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function isSuspended(user: UserAdmin): boolean {
  return typeof user.settings?.suspended_from_role === "string"
}

export function displayName(user: UserAdmin): string {
  return (
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    "—"
  )
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
}
