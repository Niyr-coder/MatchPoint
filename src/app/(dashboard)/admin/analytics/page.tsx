import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getAdminAnalytics } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DollarSign, Users, Calendar, Trophy, Building2 } from "lucide-react"

// ── small inline bar chart component (server-safe, no framer-motion) ──────────

function BarChart({
  bars,
  color = "#1a56db",
}: {
  bars: Array<{ label: string; value: number }>
  color?: string
}) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-1.5 h-[72px]">
        {bars.map((bar, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${(bar.value / maxVal) * 64}px`,
                backgroundColor: color,
                opacity: bar.value === 0 ? 0.12 : 0.35 + (bar.value / maxVal) * 0.65,
                minHeight: bar.value > 0 ? "4px" : "2px",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-1.5">
        {bars.map((bar, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] font-bold text-zinc-400 uppercase leading-none">
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── status label helper ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  draft: "Borrador",
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-emerald-50 text-emerald-700",
  completed: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-50 text-red-600",
  draft: "bg-amber-50 text-amber-700",
}

export default async function AdminAnalyticsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const analytics = await getAdminAnalytics()

  const userBars = analytics.usersByMonth.map((m) => ({ label: m.month, value: m.count }))
  const reservationBars = analytics.reservationsByMonth.map((m) => ({ label: m.month, value: m.count }))
  const revenueBars = analytics.reservationsByMonth.map((m) => ({ label: m.month, value: m.revenue }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Inteligencia" title="Analytics de la Plataforma" />

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Ingresos Totales"
          value={`$${analytics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          label="Ingresos Este Mes"
          value={`$${analytics.revenueThisMonth.toFixed(2)}`}
          icon={DollarSign}
          variant="accent"
        />
        <StatCard
          label="Reservas (6 meses)"
          value={analytics.reservationsByMonth.reduce((s, m) => s + m.count, 0)}
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Monthly charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User growth */}
        <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-[#1a56db]/10 flex items-center justify-center">
              <Users className="size-4 text-[#1a56db]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Crecimiento de usuarios
              </p>
              <p className="text-xs text-zinc-500">Últimos 6 meses</p>
            </div>
          </div>
          <BarChart bars={userBars} color="#1a56db" />
          <div className="pt-3 border-t border-[#f0f0f0] flex justify-between">
            {analytics.usersByMonth.map((m, i) => (
              <div key={i} className="text-center">
                <p className="text-xs font-black text-[#0a0a0a]">{m.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reservations */}
        <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-[#16a34a]/10 flex items-center justify-center">
              <Calendar className="size-4 text-[#16a34a]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Reservas mensuales
              </p>
              <p className="text-xs text-zinc-500">Últimos 6 meses (excl. canceladas)</p>
            </div>
          </div>
          <BarChart bars={reservationBars} color="#16a34a" />
          <div className="pt-3 border-t border-[#f0f0f0] flex justify-between">
            {analytics.reservationsByMonth.map((m, i) => (
              <div key={i} className="text-center">
                <p className="text-xs font-black text-[#0a0a0a]">{m.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue trend */}
        <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-[#dc2626]/10 flex items-center justify-center">
              <DollarSign className="size-4 text-[#dc2626]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Ingresos mensuales
              </p>
              <p className="text-xs text-zinc-500">Últimos 6 meses en USD</p>
            </div>
          </div>
          <BarChart bars={revenueBars} color="#dc2626" />
          <div className="pt-3 border-t border-[#f0f0f0] flex justify-between">
            {analytics.reservationsByMonth.map((m, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-black text-[#0a0a0a]">${m.revenue.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tournaments by status */}
        <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Trophy className="size-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Torneos por estado
              </p>
              <p className="text-xs text-zinc-500">Distribución total</p>
            </div>
          </div>
          {analytics.tournamentsByStatus.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Sin torneos registrados</p>
          ) : (
            <div className="flex flex-col gap-2 mt-1">
              {analytics.tournamentsByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? "bg-zinc-100 text-zinc-500"}`}
                  >
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                  <span className="text-sm font-black text-[#0a0a0a]">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top clubs */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Building2 className="size-4 text-zinc-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Top 5 clubs más activos
          </p>
        </div>
        {analytics.topClubs.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">Sin datos de reservas por club</p>
        ) : (
          <div className="flex flex-col divide-y divide-[#f0f0f0]">
            {analytics.topClubs.map((club, i) => (
              <div key={club.club_id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-zinc-300 w-5 text-right">{i + 1}</span>
                  <span className="text-sm font-bold text-[#0a0a0a]">{club.name}</span>
                </div>
                <span className="text-xs font-black text-[#1a56db] bg-[#1a56db]/10 px-2.5 py-1 rounded-full">
                  {club.reservation_count} reservas
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
