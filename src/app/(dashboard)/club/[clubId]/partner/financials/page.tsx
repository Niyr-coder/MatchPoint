import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(amount)

function KpiCard({
  label,
  value,
  sub,
  color = "zinc",
}: {
  label: string
  value: string
  sub?: string
  color?: "green" | "red" | "blue" | "zinc"
}) {
  const colorMap = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    zinc: "text-zinc-800",
  }
  return (
    <div className="border border-[#e5e5e5] rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
      <p className={`text-3xl font-black tracking-tight ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed")
    return (
      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        Confirmada
      </span>
    )
  if (status === "pending")
    return (
      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
        Pendiente
      </span>
    )
  return (
    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
      Cancelada
    </span>
  )
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function PartnerFinancialsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["partner", "owner"] })

  const supabase = await createClient()
  const userId = ctx.userId

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // 6 months for trend
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .split("T")[0]

  // ── My reservations this month ──
  type ResRow = {
    id: string
    date: string
    total_price: number
    status: string
    courts: { sport: string; name: string } | null
  }

  let myReservations: ResRow[] = []
  let allReservations: ResRow[] = []

  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, date, total_price, status, courts!inner(sport, name)")
      .eq("user_id", userId)
      .eq("courts.club_id", clubId)
      .gte("date", sixMonthsAgo)
      .lte("date", monthEnd)
      .order("date", { ascending: false })
    if (!error && data) allReservations = data as unknown as ResRow[]
  } catch {
    // fallback to empty
  }

  myReservations = allReservations.filter(
    (r) => r.date >= monthStart && r.date <= monthEnd
  )

  const confirmedThisMonth = myReservations.filter((r) => r.status !== "cancelled")
  const spentThisMonth = confirmedThisMonth.reduce((sum, r) => sum + (r.total_price ?? 0), 0)
  const reservationCount = confirmedThisMonth.length
  const avgTicket = reservationCount > 0 ? spentThisMonth / reservationCount : 0

  // Last 5 reservations
  const lastFive = allReservations.slice(0, 5)

  // Sport breakdown
  const sportTotals: Record<string, number> = {}
  for (const r of confirmedThisMonth) {
    const sport = r.courts?.sport ?? "otros"
    sportTotals[sport] = (sportTotals[sport] ?? 0) + (r.total_price ?? 0)
  }
  const sportEntries = Object.entries(sportTotals).sort((a, b) => b[1] - a[1])
  const hasSportData = sportEntries.length > 0

  // 6-month spend trend
  const months: Array<{ label: string; amount: number; isCurrent: boolean }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString("es-EC", { month: "short" }),
      amount: 0,
      isCurrent: i === 0,
    })
  }
  for (const r of allReservations) {
    if (r.status === "cancelled") continue
    const rDate = new Date(r.date)
    const idx = months.findIndex((_, i) => {
      const mDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return rDate.getFullYear() === mDate.getFullYear() && rDate.getMonth() === mDate.getMonth()
    })
    if (idx >= 0) months[idx].amount += r.total_price ?? 0
  }
  const maxMonthAmount = Math.max(...months.map((m) => m.amount), 1)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="SOCIO · FINANCIERO"
        title="Mi Financiero"
        description="Tu actividad de reservas y gasto en el club"
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Gasto del mes"
          value={fmt(spentThisMonth)}
          sub="Reservas confirmadas"
          color="blue"
        />
        <KpiCard
          label="Mis reservas"
          value={String(reservationCount)}
          sub="Este mes"
          color="zinc"
        />
        <KpiCard
          label="Ticket promedio"
          value={fmt(avgTicket)}
          sub="Por reserva"
          color="zinc"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Sport breakdown */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Desglose"
          title="Gasto por deporte"
          subtitle={hasSportData ? "Este mes" : "Sin reservas este mes"}
          index={0}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
            {hasSportData ? (
              sportEntries.map(([sport, amount]) => {
                const pct = spentThisMonth > 0 ? Math.round((amount / spentThisMonth) * 100) : 0
                return (
                  <div key={sport} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-700">
                        {SPORT_LABELS[sport] ?? sport}
                      </span>
                      <span className="text-xs font-black text-zinc-500">
                        {pct}% · {fmt(amount)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1e40af]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-zinc-400 text-center py-4">
                No hay reservas este mes
              </p>
            )}
          </div>
        </BentoCard>

        {/* Last 5 reservations */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Historial"
          title="Mis últimas reservas"
          subtitle="Las 5 más recientes en este club"
          index={1}
        >
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#e5e5e5]">
            {lastFive.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">
                No hay reservas recientes
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
                    <StatusBadge status={r.status} />
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

      {/* 6-month spend trend — full width */}
      <BentoCard
        variant="default"
        icon="Activity"
        label="Tendencia"
        title="Mi gasto últimos 6 meses"
        subtitle="Evolución mensual de tu inversión en el club"
        index={2}
      >
        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
          <div className="flex items-end justify-between gap-2 h-[80px]">
            {months.map((m, i) => {
              const heightPct = (m.amount / maxMonthAmount) * 100
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full rounded-t-sm ${m.isCurrent ? "bg-[#1e40af]" : "bg-zinc-200"}`}
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
