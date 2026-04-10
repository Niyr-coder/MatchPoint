type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info" | "accent"

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-success text-primary border-success-border",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error:   "bg-red-50 text-red-600 border-red-200",
  neutral: "bg-secondary text-muted-foreground border-border",
  info:    "bg-card text-foreground border-border",
  accent:  "bg-foreground text-background border-foreground",
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
