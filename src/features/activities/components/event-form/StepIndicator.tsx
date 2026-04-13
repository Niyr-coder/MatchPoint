import { Check } from "lucide-react"
import { STEP_LABELS } from "./types"

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

export const inputCls =
  "border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/8 bg-card w-full"

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start mb-6">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={[
                  "size-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300",
                  done
                    ? "bg-foreground text-white"
                    : active
                      ? "bg-foreground text-white shadow-[0_0_0_4px_rgba(10,10,10,0.1)]"
                      : "bg-muted text-zinc-400 border border-border",
                ].join(" ")}
              >
                {done ? <Check className="size-3.5" /> : n}
              </div>
              <span
                className={[
                  "text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
                  active ? "text-foreground" : done ? "text-zinc-400" : "text-zinc-300",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={[
                  "flex-1 h-px mx-1.5 mb-4 transition-colors duration-300",
                  done ? "bg-foreground" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
