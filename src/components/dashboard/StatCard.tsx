import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  className?: string
}

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("bg-zinc-900 border-zinc-800", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-black text-white">
              {value}
              {suffix && (
                <span className="text-base font-semibold text-zinc-400 ml-1">{suffix}</span>
              )}
            </p>
            {trendValue && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  trend === "up" && "text-green-400",
                  trend === "down" && "text-red-400",
                  trend === "neutral" && "text-zinc-400"
                )}
              >
                {trendValue}
              </p>
            )}
          </div>
          {Icon && (
            <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
              <Icon className="size-5 text-zinc-400" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
