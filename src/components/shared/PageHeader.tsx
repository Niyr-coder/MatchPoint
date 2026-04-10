interface PageHeaderProps {
  label: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ label, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-stretch gap-3.5">
        {/* Left accent bar */}
        <div className="w-[3px] rounded-full bg-primary shrink-0 self-stretch" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary mb-1">
            {label}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-foreground leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
