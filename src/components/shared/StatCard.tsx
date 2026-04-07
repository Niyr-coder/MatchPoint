import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: "default" | "accent" | "success" | "warning"
  description?: string
}

const VARIANT_STYLES: Record<NonNullable<StatCardProps["variant"]>, { icon: string; value: string }> = {
  default:  { icon: "bg-zinc-100 text-zinc-500", value: "text-[#0a0a0a]" },
  accent:   { icon: "bg-[#0a0a0a]/10 text-[#0a0a0a]", value: "text-[#0a0a0a]" },
  success:  { icon: "bg-[#f0fdf4] text-[#16a34a]", value: "text-[#16a34a]" },
  warning:  { icon: "bg-amber-50 text-amber-600", value: "text-amber-600" },
}

export function StatCard({ label, value, icon: Icon, variant = "default", description }: StatCardProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col gap-3">
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
