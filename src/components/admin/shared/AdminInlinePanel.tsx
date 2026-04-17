import type { ReactNode } from "react"

interface AdminInlinePanelProps {
  avatar: ReactNode
  name: string
  subtitle: string
  chips?: string[]
  actions: ReactNode
  badge?: ReactNode
}

export function AdminInlinePanel({
  avatar,
  name,
  subtitle,
  chips,
  actions,
  badge,
}: AdminInlinePanelProps) {
  return (
    <div className="bg-[#f0f6ff] border-b border-[#e5e7eb] px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0">{avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-foreground leading-tight">{name}</p>
            {badge}
          </div>
          <p className="text-[12px] text-zinc-500 mt-0.5">{subtitle}</p>
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">{actions}</div>
        </div>
      </div>
    </div>
  )
}
