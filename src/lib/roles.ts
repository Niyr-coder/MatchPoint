import type { AppRole } from "@/types"

export const ROLE_LABELS: Record<AppRole, string> = {
  admin:    "Admin",
  owner:    "Dueño",
  partner:  "Socio",
  manager:  "Gerente",
  employee: "Empleado",
  coach:    "Entrenador",
  user:     "Jugador",
}

export interface RoleColor {
  bg: string
  text: string
  border: string
}

export const ROLE_COLORS: Record<AppRole, RoleColor> = {
  admin:    { bg: "bg-[#0a0a0a]",      text: "text-white",        border: "border-[#0a0a0a]" },
  owner:    { bg: "bg-blue-50",        text: "text-[#1a56db]",    border: "border-blue-200" },
  partner:  { bg: "bg-teal-50",        text: "text-teal-700",     border: "border-teal-200" },
  manager:  { bg: "bg-[#f0fdf4]",      text: "text-[#16a34a]",   border: "border-[#bbf7d0]" },
  employee: { bg: "bg-zinc-100",       text: "text-zinc-500",     border: "border-zinc-200" },
  coach:    { bg: "bg-amber-50",       text: "text-amber-700",    border: "border-amber-200" },
  user:     { bg: "bg-violet-50",      text: "text-violet-700",   border: "border-violet-200" },
}

export function getRoleDashboardPath(role: AppRole, clubId?: string | null): string {
  if (role === "admin") return "/admin"
  if (role === "user") return "/dashboard"
  if (clubId) return `/club/${clubId}/${role}`
  return "/dashboard"
}
