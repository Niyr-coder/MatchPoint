type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info" | "accent"

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error:   "bg-red-50 text-red-600 border-red-200",
  neutral: "bg-zinc-100 text-zinc-500 border-zinc-200",
  info:    "bg-blue-50 text-[#1a56db] border-blue-200",
  accent:  "bg-[#0a0a0a] text-white border-[#0a0a0a]",
}

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
  className?: string
}

export function StatusBadge({ label, variant, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  )
}
