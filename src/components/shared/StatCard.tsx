import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: "default" | "accent" | "success" | "warning"
  description?: string
}

const VARIANT_STYLES: Record<NonNullable<StatCardProps["variant"]>, { icon: string; value: string }> = {
  default:  { icon: "bg-secondary text-muted-foreground", value: "text-foreground" },
  accent:   { icon: "bg-foreground/10 text-foreground", value: "text-foreground" },
  success:  { icon: "bg-success text-primary", value: "text-primary" },
  warning:  { icon: "bg-amber-50 text-amber-600", value: "text-amber-600" },
}

export function StatCard({ label, value, icon: Icon, variant = "default", description }: StatCardProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 transition-all duration-200 ease-out hover:border-border/60 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
      {Icon && (
        <div className={`size-9 rounded-xl flex items-center justify-center ${styles.icon}`}>
          <Icon className="size-4" />
        </div>
      )}
      <div>
        <p className={`text-2xl font-black ${styles.value}`}>{value}</p>
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">{label}</p>
        {description && (
          <p className="text-[11px] text-zinc-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}
