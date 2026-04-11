import Link from "next/link"
import { DollarSign, TrendingUp, TrendingDown, Award, ExternalLink } from "lucide-react"
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
    <div className="bg-muted/50 border border-zinc-100 rounded-xl p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
      <p className="text-xl font-black text-zinc-900 leading-none">{value}</p>
      {trend && (
        <div className={cn("flex items-center gap-0.5 mt-1", trend.up ? "text-emerald-600" : "text-red-500")}>
          {trend.up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
          <span className="text-[9px] font-black">{trend.up ? "+" : ""}{trend.pct}% vs mes ant.</span>
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
  const totalClubRev = revenue.topClubsByRevenue.reduce((s, c) => s + c.revenue, 0)

  return (
    <div className="rounded-2xl bg-card overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <DollarSign className="size-3.5 text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Revenue</p>
      </div>

      <div className="p-4 space-y-4">
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

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Award className="size-3 text-amber-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Por club</p>
            </div>
            <Link
              href="/admin/clubs"
              className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-600 flex items-center gap-0.5 transition-colors"
            >
              Ver todos <ExternalLink className="size-2.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {revenue.topClubsByRevenue.length === 0 ? (
              <p className="text-xs text-zinc-400">Sin datos de revenue</p>
            ) : (
              revenue.topClubsByRevenue.map((club, idx) => {
                const sharePct = totalClubRev > 0 ? Math.round((club.revenue / totalClubRev) * 100) : 0
                return (
                  <Link
                    key={club.id}
                    href={`/admin/clubs`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-black text-zinc-300 w-3 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-700 group-hover:text-zinc-900 truncate transition-colors">
                          {club.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        <span className="text-[9px] text-zinc-400">{sharePct}%</span>
                        <span className="text-[10px] font-black text-emerald-600">${club.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300 group-hover:bg-emerald-400"
                        style={{ width: `${(club.revenue / maxRev) * 100}%` }}
                      />
                    </div>
                    {club.matches > 0 && (
                      <p className="text-[9px] text-zinc-400 mt-0.5">{club.matches} matches</p>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
