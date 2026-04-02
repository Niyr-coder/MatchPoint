import { DollarSign, TrendingUp, TrendingDown, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface RevenueData {
  total: number
  thisMonth: number
  lastMonth: number
  avgPerMatch: number
  tournamentRevenue: number
  topClubsByRevenue: Array<{ id: string; name: string; revenue: number; matches: number }>
}

function StatChip({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: { up: boolean; pct: number } | null
}) {
  return (
    <div className="bg-zinc-800 rounded-xl p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      {trend && (
        <div className={cn("flex items-center gap-0.5 mt-1", trend.up ? "text-emerald-400" : "text-red-400")}>
          {trend.up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
          <span className="text-[9px] font-black">{trend.up ? "+" : ""}{trend.pct}% vs mes anterior</span>
        </div>
      )}
    </div>
  )
}

interface Props {
  revenue: RevenueData
}

export function ControlTowerRevenue({ revenue }: Props) {
  const growthPct = revenue.lastMonth > 0
    ? Math.round(((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100)
    : 0
  const maxRev = Math.max(...revenue.topClubsByRevenue.map((c) => c.revenue), 1)

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <DollarSign className="size-3.5 text-emerald-400" />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Revenue</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-2">
          <StatChip label="Total acumulado" value={`$${revenue.total.toFixed(0)}`} />
          <StatChip
            label="Este mes"
            value={`$${revenue.thisMonth.toFixed(0)}`}
            trend={revenue.lastMonth > 0 ? { up: growthPct >= 0, pct: Math.abs(growthPct) } : null}
          />
          <StatChip label="Promedio / match" value={`$${revenue.avgPerMatch.toFixed(1)}`} />
          <StatChip label="Torneos" value={`$${revenue.tournamentRevenue.toFixed(0)}`} />
        </div>

        {/* Top clubs by revenue */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Award className="size-3 text-amber-400" />
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Por club</p>
          </div>
          <div className="space-y-2">
            {revenue.topClubsByRevenue.length === 0 ? (
              <p className="text-xs text-zinc-600">Sin datos de revenue</p>
            ) : (
              revenue.topClubsByRevenue.map((club) => (
                <div key={club.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-zinc-300 truncate pr-2">{club.name}</span>
                    <span className="text-[10px] font-black text-emerald-400 shrink-0">${club.revenue.toFixed(0)}</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(club.revenue / maxRev) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
