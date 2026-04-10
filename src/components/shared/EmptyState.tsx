import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-border rounded-2xl">
      <Icon className="size-10 text-zinc-300" />
      <p className="text-sm font-bold text-zinc-400">{title}</p>
      {description && (
        <p className="text-xs text-zinc-300 text-center max-w-xs">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
