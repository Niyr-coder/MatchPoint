import type { ControlTowerKPIs } from "@/lib/admin/queries"
import { Users, Building2, Trophy, DollarSign, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "green" | "blue" | "amber" | "red" | "purple" | "cyan"

const ACCENT: Record<Accent, { icon: string; badge: string }> = {
  green:  { icon: "text-emerald-400", badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  blue:   { icon: "text-blue-400",    badge: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  cyan:   { icon: "text-cyan-400",    badge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  amber:  { icon: "text-amber-400",   badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  red:    { icon: "text-red-400",     badge: "text-red-400 bg-red-500/10 border-red-500/30" },
  purple: { icon: "text-violet-400",  badge: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
}

interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  trend?: { value: string; up: boolean } | null
  accent?: Accent
}

function KPICard({ icon, label, value, sub, trend, accent = "green" }: KPICardProps) {
  const a = ACCENT[accent]
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-4 min-h-[130px]">
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between">
        <div className={cn("size-8 rounded-xl flex items-center justify-center bg-zinc-800 shrink-0", a.icon)}>
          {icon}
        </div>
        {trend && (
          <span className={cn("text-[10px] font-black border px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0", a.badge)}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>

      {/* Bottom row: value + label */}
      <div className="mt-auto">
        <p className="text-3xl font-black text-white tracking-tight leading-none">{value}</p>
        <p className={cn("text-[10px] font-black uppercase tracking-[0.16em] mt-1.5 truncate", a.icon)}>{label}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}

interface Props {
  kpis: ControlTowerKPIs
}

export function ControlTowerKPIs({ kpis }: Props) {
  const growthPct = kpis.totalUsers > 0
    ? Math.round((kpis.newUsersThisMonth / kpis.totalUsers) * 100)
    : 0
  const revGrowthPct = kpis.revenueLastMonth > 0
    ? Math.round(((kpis.revenueThisMonth - kpis.revenueLastMonth) / kpis.revenueLastMonth) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPICard
        icon={<Users className="size-4" />}
        label="Usuarios"
        value={kpis.totalUsers.toLocaleString()}
        sub={`+${kpis.newUsersThisMonth} este mes`}
        trend={growthPct > 0 ? { value: `${growthPct}%`, up: true } : null}
        accent="green"
      />
      <KPICard
        icon={<Zap className="size-4" />}
        label="Activos (7 días)"
        value={kpis.activePlayersThisWeek.toLocaleString()}
        sub="Nuevos registros"
        accent="cyan"
      />
      <KPICard
        icon={<Building2 className="size-4" />}
        label="Clubs"
        value={kpis.totalClubs.toLocaleString()}
        sub="Verificados activos"
        accent="amber"
      />
      <KPICard
        icon={<Trophy className="size-4" />}
        label="Matches hoy"
        value={kpis.activeMatchesToday.toLocaleString()}
        sub="Reservas confirmadas"
        accent="purple"
      />
      <KPICard
        icon={<DollarSign className="size-4" />}
        label="Revenue"
        value={`$${kpis.totalRevenue.toFixed(0)}`}
        sub={`$${kpis.revenueThisMonth.toFixed(0)} este mes`}
        trend={revGrowthPct !== 0 ? { value: `${Math.abs(revGrowthPct)}%`, up: revGrowthPct >= 0 } : null}
        accent="green"
      />
      <KPICard
        icon={<TrendingUp className="size-4" />}
        label="Torneos"
        value={kpis.totalTournaments.toLocaleString()}
        sub="Total registrados"
        accent="red"
      />
    </div>
  )
}
