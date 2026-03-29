import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        "rounded-xl border border-zinc-800 bg-zinc-900/50",
        className
      )}
    >
      {Icon && (
        <div className="size-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
          <Icon className="size-6 text-zinc-500" />
        </div>
      )}
      <p className="text-sm font-semibold text-white">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-zinc-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
