import type { ControlTowerKPIs } from "@/lib/admin/queries"
import { Users, Building2, Trophy, DollarSign, TrendingUp, Zap, Target, CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "green" | "blue" | "amber" | "red" | "purple" | "cyan" | "teal" | "orange"

const ACCENT: Record<Accent, { icon: string; iconBg: string; badge: string; label: string }> = {
  green:  { icon: "text-emerald-600", iconBg: "bg-emerald-50",  badge: "text-emerald-700 bg-emerald-50 border-emerald-200",  label: "text-emerald-600" },
  blue:   { icon: "text-foreground",  iconBg: "bg-secondary",   badge: "text-foreground bg-secondary border-border",          label: "text-foreground" },
  cyan:   { icon: "text-cyan-600",    iconBg: "bg-cyan-50",     badge: "text-cyan-700 bg-cyan-50 border-cyan-200",            label: "text-cyan-600" },
  amber:  { icon: "text-amber-600",   iconBg: "bg-amber-50",    badge: "text-amber-700 bg-amber-50 border-amber-200",         label: "text-amber-600" },
  red:    { icon: "text-red-600",     iconBg: "bg-red-50",      badge: "text-red-700 bg-red-50 border-red-200",               label: "text-red-600" },
  purple: { icon: "text-violet-600",  iconBg: "bg-violet-50",   badge: "text-violet-700 bg-violet-50 border-violet-200",      label: "text-violet-600" },
  teal:   { icon: "text-teal-600",    iconBg: "bg-teal-50",     badge: "text-teal-700 bg-teal-50 border-teal-200",            label: "text-teal-600" },
  orange: { icon: "text-orange-600",  iconBg: "bg-orange-50",   badge: "text-orange-700 bg-orange-50 border-orange-200",      label: "text-orange-600" },
}

function wow(current: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
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
    <div className="relative overflow-hidden rounded-2xl bg-card p-5 flex flex-col gap-4 min-h-[130px]">
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
        <p className="text-3xl font-black text-foreground tracking-tight leading-none">{value}</p>
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
  const userWow = wow(kpis.usersThisWeek, kpis.usersLastWeek)
  const matchWow = wow(kpis.matchesThisWeek, kpis.matchesLastWeek)
  const revWow = wow(kpis.revenueThisWeek, kpis.revenueLastWeek)
  const revGrowthPct = kpis.revenueLastMonth > 0
    ? Math.round(((kpis.revenueThisMonth - kpis.revenueLastMonth) / kpis.revenueLastMonth) * 100)
    : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <KPICard
        icon={<Users className="size-4" />}
        label="Usuarios"
        value={kpis.totalUsers.toLocaleString()}
        sub={`+${kpis.newUsersThisMonth} este mes`}
        trend={userWow ? { value: `${userWow.pct}% vs sem`, up: userWow.up } : null}
        accent="green"
      />
      <KPICard
        icon={<Zap className="size-4" />}
        label="Activos (7 días)"
        value={kpis.activePlayersThisWeek.toLocaleString()}
        sub="Registros esta semana"
        trend={userWow ? { value: `${userWow.pct}%`, up: userWow.up } : null}
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
        icon={<CalendarCheck className="size-4" />}
        label="Matches hoy"
        value={kpis.activeMatchesToday.toLocaleString()}
        sub="Reservas confirmadas"
        trend={matchWow ? { value: `${matchWow.pct}% vs sem`, up: matchWow.up } : null}
        accent="purple"
      />
      <KPICard
        icon={<DollarSign className="size-4" />}
        label="Revenue"
        value={`$${kpis.totalRevenue.toFixed(0)}`}
        sub={`$${kpis.revenueThisMonth.toFixed(0)} este mes`}
        trend={revGrowthPct !== 0 ? { value: `${Math.abs(revGrowthPct)}% MoM`, up: revGrowthPct >= 0 } : revWow ? { value: `${revWow.pct}% WoW`, up: revWow.up } : null}
        accent="green"
      />
      <KPICard
        icon={<Trophy className="size-4" />}
        label="Torneos"
        value={kpis.totalTournaments.toLocaleString()}
        sub="Total registrados"
        accent="red"
      />
      <KPICard
        icon={<Target className="size-4" />}
        label="Conversión"
        value={`${kpis.conversionRate}%`}
        sub="Usuarios con reservas"
        accent="teal"
      />
      <KPICard
        icon={<TrendingUp className="size-4" />}
        label="Pipeline 7d"
        value={kpis.pipelineNext7Days.toLocaleString()}
        sub="Reservas próximos 7 días"
        accent="orange"
      />
    </div>
  )
}
