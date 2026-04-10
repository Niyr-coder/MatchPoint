interface DashboardHeadingProps {
  label: string
  title: string
  subtitle?: string
}

export function DashboardHeading({ label, title, subtitle }: DashboardHeadingProps) {
  return (
    <div className="pb-6 mb-2 border-b border-border">
      <p className="label-green mb-1">{label}</p>
      <h1
        className="font-black text-foreground uppercase leading-[0.88] tracking-[-0.03em]"
        style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500 font-medium">{subtitle}</p>
      )}
    </div>
  )
}
