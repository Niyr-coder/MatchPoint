import { authorizeOrRedirect } from "@/features/auth/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"
import { DollarSign, Calendar, TrendingUp } from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(amount)

// ─── sport display map ───────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const SPORT_COLORS: Record<string, string> = {
  futbol: "bg-green-500",
  padel: "bg-secondary",
  tenis: "bg-yellow-500",
  pickleball: "bg-orange-500",
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function OwnerFinancialsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const supabase = await createClient()

  // Current month boundaries
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // ── 1. Reservations this month (join via courts to get club_id & sport) ──
  type ReservationRow = {
    id: string
    date: string
    total_price: number
    status: string
    courts: { sport: string; name: string } | null
  }

  let reservations: ReservationRow[] = []
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, date, total_price, status, courts!inner(sport, name)")
      .eq("courts.club_id", clubId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false })
    if (!error && data) reservations = data as unknown as ReservationRow[]
  } catch {
    // handled via fallback values below
  }

  // ── 2. Cash register entries this month ──
  type CashRow = { type: string; amount: number }
  let cashEntries: CashRow[] = []
  try {
    const { data, error } = await supabase
      .from("cash_register_entries")
      .select("type, amount")
      .eq("club_id", clubId)
      .gte("created_at", `${monthStart}T00:00:00`)
      .lte("created_at", `${monthEnd}T23:59:59`)
    if (!error && data) cashEntries = data as CashRow[]
  } catch {
    // handled via fallback
  }

  // ── 3. Compute KPIs ──
  const confirmedRes = reservations.filter((r) => r.status !== "cancelled")
  const totalRevenue = confirmedRes.reduce((sum, r) => sum + (r.total_price ?? 0), 0)
  const reservationCount = confirmedRes.length
  const avgTicket = reservationCount > 0 ? totalRevenue / reservationCount : 0

  const cashIncome = cashEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const cashExpense = cashEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)

  // ── 4. Revenue by sport ──
  const sportTotals: Record<string, number> = {}
  for (const r of confirmedRes) {
    const sport = r.courts?.sport ?? "otros"
    sportTotals[sport] = (sportTotals[sport] ?? 0) + (r.total_price ?? 0)
  }

  // If no real data, use demo percentages
  const hasSportData = Object.keys(sportTotals).length > 0
  const sportBars: Array<{ sport: string; pct: number; amount: number }> = hasSportData
    ? Object.entries(sportTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([sport, amount]) => ({
          sport,
          pct: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
          amount,
        }))
    : [
        { sport: "futbol", pct: 40, amount: 0 },
        { sport: "padel", pct: 35, amount: 0 },
        { sport: "tenis", pct: 15, amount: 0 },
        { sport: "pickleball", pct: 10, amount: 0 },
      ]

  // ── 5. Last 5 reservations ──
  const lastFive = reservations.slice(0, 5)

  // ── 6. 6-month trend ──
  const months: Array<{ label: string; amount: number; isCurrent: boolean }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString("es-EC", { month: "short" })
    months.push({ label, amount: 0, isCurrent: i === 0 })
  }

  // Fill with real reservation data grouped by month
  for (const r of reservations) {
    const rDate = new Date(r.date)
    const monthIdx = months.findIndex((m, idx) => {
      const mDate = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      return (
        rDate.getFullYear() === mDate.getFullYear() &&
        rDate.getMonth() === mDate.getMonth()
      )
    })
    if (monthIdx >= 0 && r.status !== "cancelled") {
      months[monthIdx].amount += r.total_price ?? 0
    }
  }

  const maxMonthAmount = Math.max(...months.map((m) => m.amount), 1)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="OWNER · FINANCIERO"
        title="Financiero del Club"
        description="Ingresos, reservas y tendencias del mes actual"
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Ingresos del mes"
          value={fmt(totalRevenue)}
          icon={DollarSign}
          variant="success"
          description={cashIncome > 0 ? `+ ${fmt(cashIncome)} caja` : "Solo reservas"}
        />
        <StatCard
          label="Reservas del mes"
          value={reservationCount}
          icon={Calendar}
          variant="default"
          description="Reservas no canceladas"
        />
        <StatCard
          label="Ticket promedio"
          value={fmt(avgTicket)}
          icon={TrendingUp}
          variant="default"
          description={cashExpense > 0 ? `Gastos: ${fmt(cashExpense)}` : "Sin gastos registrados"}
        />
      </div>

      {/* Main 2-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue by sport */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Desglose"
          title="Ingresos por deporte"
          subtitle={hasSportData ? "Datos reales del mes" : "Distribución estimada"}
          index={0}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
            {sportBars.map((bar) => (
              <div key={bar.sport} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">
                    {SPORT_LABELS[bar.sport] ?? bar.sport}
                  </span>
                  <span className="text-xs font-black text-zinc-500">
                    {bar.pct}%{hasSportData && bar.amount > 0 ? ` · ${fmt(bar.amount)}` : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${SPORT_COLORS[bar.sport] ?? "bg-zinc-400"}`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Last 5 reservations */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Actividad"
          title="Últimas transacciones"
          subtitle="Las 5 reservas más recientes del mes"
          index={1}
        >
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
            {lastFive.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">
                No hay reservas este mes
              </p>
            ) : (
              lastFive.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-zinc-50 last:border-0"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-800 truncate">
                      {SPORT_LABELS[r.courts?.sport ?? ""] ?? r.courts?.name ?? "Cancha"}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(r.date).toLocaleDateString("es-EC", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge
                      label={r.status === "confirmed" ? "Confirmada" : r.status === "pending" ? "Pendiente" : "Cancelada"}
                      variant={r.status === "confirmed" ? "success" : r.status === "pending" ? "warning" : "error"}
                    />
                    <span className="text-xs font-black text-zinc-800">
                      {fmt(r.total_price ?? 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </BentoCard>
      </div>

      {/* 6-month trend — full width */}
      <BentoCard
        variant="default"
        icon="Activity"
        label="Tendencia"
        title="Ingresos últimos 6 meses"
        subtitle="Evolución mensual de ingresos por reservas"
        index={2}
      >
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
          <div className="flex items-end justify-between gap-2 h-[80px]">
            {months.map((m, i) => {
              const heightPct = maxMonthAmount > 0 ? (m.amount / maxMonthAmount) * 100 : 8
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      m.isCurrent ? "bg-foreground" : "bg-zinc-200"
                    }`}
                    style={{ height: `${Math.max(heightPct * 0.8, 6)}px` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-2">
            {months.map((m, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase">{m.label}</span>
                {m.amount > 0 && (
                  <span className="text-[8px] font-black text-zinc-500 hidden sm:block">
                    {fmt(m.amount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </BentoCard>
    </div>
  )
}
