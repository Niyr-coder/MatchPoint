import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles"
import type { AppRole } from "@/types"
import { cn } from "@/lib/utils"

interface RoleBadgeProps {
  role: AppRole
  size?: "sm" | "md"
  className?: string
}

export function RoleBadge({ role, size = "sm", className }: RoleBadgeProps) {
  const colors = ROLE_COLORS[role]
  return (
    <span
      className={cn(
        "font-black uppercase tracking-wide rounded-full border",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
