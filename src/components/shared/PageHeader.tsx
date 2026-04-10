interface PageHeaderProps {
  label: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ label, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 pb-4 border-b border-border">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
          {label}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-foreground leading-none">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-500 mt-1.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
