import type { ControlTowerKPIs } from "@/lib/admin/queries"
import { Users, Building2, Trophy, DollarSign, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  trend?: { value: string; up: boolean } | null
  accent?: "green" | "blue" | "amber" | "red" | "purple"
}

const ACCENT: Record<string, { bg: string; icon: string; trend: string; badge: string }> = {
  green:  { bg: "from-emerald-500/10 to-transparent", icon: "text-emerald-400", trend: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  blue:   { bg: "from-sky-500/10 to-transparent",     icon: "text-sky-400",     trend: "text-sky-400",     badge: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  amber:  { bg: "from-amber-500/10 to-transparent",   icon: "text-amber-400",   trend: "text-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  red:    { bg: "from-red-500/10 to-transparent",     icon: "text-red-400",     trend: "text-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  purple: { bg: "from-violet-500/10 to-transparent",  icon: "text-violet-400",  trend: "text-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
}

function KPICard({ icon, label, value, sub, trend, accent = "green" }: KPICardProps) {
  const a = ACCENT[accent]
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-3 min-h-[130px]">
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", a.bg)} />
      <div className="relative z-10 flex items-start justify-between">
        <div className={cn("size-8 rounded-xl flex items-center justify-center bg-zinc-800", a.icon)}>
          {icon}
        </div>
        {trend && (
          <span className={cn("text-[10px] font-black border px-2 py-0.5 rounded-full uppercase tracking-wider", a.badge)}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-auto">
        <p className="text-3xl font-black text-white tracking-tight leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mt-1">{label}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>
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
        label="Usuarios totales"
        value={kpis.totalUsers.toLocaleString()}
        sub={`+${kpis.newUsersThisMonth} este mes`}
        trend={growthPct > 0 ? { value: `${growthPct}%`, up: true } : null}
        accent="green"
      />
      <KPICard
        icon={<Zap className="size-4" />}
        label="Activos esta semana"
        value={kpis.activePlayersThisWeek.toLocaleString()}
        sub="Nuevos registros 7 días"
        accent="blue"
      />
      <KPICard
        icon={<Building2 className="size-4" />}
        label="Clubs activos"
        value={kpis.totalClubs.toLocaleString()}
        sub="Clubes verificados"
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
        label="Revenue total"
        value={`$${kpis.totalRevenue.toFixed(0)}`}
        sub={`$${kpis.revenueThisMonth.toFixed(0)} este mes`}
        trend={revGrowthPct !== 0 ? { value: `${Math.abs(revGrowthPct)}%`, up: revGrowthPct >= 0 } : null}
        accent="green"
      />
      <KPICard
        icon={<TrendingUp className="size-4" />}
        label="Torneos"
        value={kpis.totalTournaments.toLocaleString()}
        sub="Torneos registrados"
        accent="red"
      />
    </div>
  )
}
