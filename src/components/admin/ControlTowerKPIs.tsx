import type { ControlTowerKPIs } from "@/lib/admin/queries"
import { Users, Building2, Trophy, DollarSign, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "green" | "blue" | "amber" | "red" | "purple" | "cyan"

const ACCENT: Record<Accent, { icon: string; iconBg: string; badge: string; label: string }> = {
  green:  { icon: "text-emerald-600", iconBg: "bg-emerald-50",  badge: "text-emerald-700 bg-emerald-50 border-emerald-200",  label: "text-emerald-600" },
  blue:   { icon: "text-blue-600",    iconBg: "bg-blue-50",     badge: "text-blue-700 bg-blue-50 border-blue-200",            label: "text-blue-600" },
  cyan:   { icon: "text-cyan-600",    iconBg: "bg-cyan-50",     badge: "text-cyan-700 bg-cyan-50 border-cyan-200",            label: "text-cyan-600" },
  amber:  { icon: "text-amber-600",   iconBg: "bg-amber-50",    badge: "text-amber-700 bg-amber-50 border-amber-200",         label: "text-amber-600" },
  red:    { icon: "text-red-600",     iconBg: "bg-red-50",      badge: "text-red-700 bg-red-50 border-red-200",               label: "text-red-600" },
  purple: { icon: "text-violet-600",  iconBg: "bg-violet-50",   badge: "text-violet-700 bg-violet-50 border-violet-200",      label: "text-violet-600" },
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
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 flex flex-col gap-4 min-h-[130px]" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start justify-between">
        <div className={cn("size-8 rounded-xl flex items-center justify-center shrink-0", a.iconBg, a.icon)}>
          {icon}
        </div>
        {trend && (
          <span className={cn("text-[10px] font-black border px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0", a.badge)}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-auto">
        <p className="text-3xl font-black text-zinc-900 tracking-tight leading-none">{value}</p>
        <p className={cn("text-[10px] font-black uppercase tracking-[0.16em] mt-1.5 truncate", a.label)}>{label}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{sub}</p>
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
