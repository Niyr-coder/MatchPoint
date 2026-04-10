import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: "default" | "accent" | "success" | "warning"
  description?: string
}

const VARIANT_STYLES: Record<
  NonNullable<StatCardProps["variant"]>,
  { bar: string; icon: string; value: string }
> = {
  default:  { bar: "bg-border",    icon: "bg-secondary text-muted-foreground", value: "text-foreground" },
  accent:   { bar: "bg-foreground", icon: "bg-foreground/10 text-foreground",   value: "text-foreground" },
  success:  { bar: "bg-primary",   icon: "bg-success text-primary",            value: "text-primary" },
  warning:  { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600",         value: "text-amber-600" },
}

export function StatCard({ label, value, icon: Icon, variant = "default", description }: StatCardProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className="relative rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 overflow-hidden transition-all duration-200 ease-out hover:border-border/60 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${styles.bar}`} />

      <div className="flex items-start justify-between gap-3 mt-1">
        <div className="flex-1 min-w-0">
          <p className={`text-3xl font-black leading-none tabular-nums ${styles.value}`}>{value}</p>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mt-1.5">{label}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground/70 mt-1">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${styles.icon}`}>
            <Icon className="size-4" />
          </div>
        )}
      </div>
    </div>
  )
}
