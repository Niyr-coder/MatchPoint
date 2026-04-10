import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { DailyReportForm } from "@/components/dashboard/DailyReportForm"
import {
  CalendarCheck,
  DollarSign,
  LogIn,
  TrendingDown,
} from "lucide-react"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(amount)

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  color?: "green" | "red" | "blue" | "zinc"
  icon: React.ReactNode
}

function KpiCard({ label, value, sub, color = "zinc", icon }: KpiCardProps) {
  const colorMap: Record<NonNullable<KpiCardProps["color"]>, string> = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-[#0a0a0a]",
    zinc: "text-zinc-800",
  }
  const iconBgMap: Record<NonNullable<KpiCardProps["color"]>, string> = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-[#f5f5f5] text-[#0a0a0a]",
    zinc: "bg-zinc-100 text-zinc-500",
  }
  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col gap-3">
      <div className={`size-9 rounded-xl flex items-center justify-center ${iconBgMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
          {label}
        </p>
        <p className={`text-2xl font-black tracking-tight ${colorMap[color]}`}>{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── data fetching ───────────────────────────────────────────────────────────

interface DayMetrics {
  reservationsTotal: number
  reservationsConfirmed: number
  reservationsPending: number
  totalIncome: number
  totalExpense: number
  checkInCount: number
}

async function getDayMetrics(clubId: string, today: string): Promise<DayMetrics> {
  const service = createServiceClient()

  const todayStart = `${today}T00:00:00`
  const todayEnd = `${today}T23:59:59`

  const [reservationsRes, cashRes] = await Promise.all([
    service
      .from("reservations")
      .select("id, status, courts!inner(club_id)")
      .eq("courts.club_id", clubId)
      .eq("date", today),
    service
      .from("cash_register_entries")
      .select("type, amount")
      .eq("club_id", clubId)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),
  ])

  type ResRow = { id: string; status: string }
  const reservations = (reservationsRes.data ?? []) as unknown as ResRow[]
  const confirmed = reservations.filter((r) => r.status === "confirmed").length
  const pending = reservations.filter((r) => r.status === "pending").length

  type CashRow = { type: string; amount: number }
  const cashEntries = (cashRes.data ?? []) as unknown as CashRow[]
  const totalIncome = cashEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const totalExpense = cashEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)

  return {
    reservationsTotal: reservations.length,
    reservationsConfirmed: confirmed,
    reservationsPending: pending,
    totalIncome,
    totalExpense,
    checkInCount: confirmed,
  }
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function EmployeeDailyReportPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const now = new Date()
  const today = now.toISOString().split("T")[0]

  const dateLabel = now.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const metrics = await getDayMetrics(clubId, today).catch(() => ({
    reservationsTotal: 0,
    reservationsConfirmed: 0,
    reservationsPending: 0,
    totalIncome: 0,
    totalExpense: 0,
    checkInCount: 0,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Empleado · Reporte Diario"
        title="Reporte del Día"
        description={dateLabel}
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Reservas"
          value={String(metrics.reservationsTotal)}
          sub="Total del día"
          color="zinc"
          icon={<CalendarCheck className="size-4" />}
        />
        <KpiCard
          label="Confirmadas"
          value={String(metrics.reservationsConfirmed)}
          sub="Check-ins realizados"
          color="blue"
          icon={<LogIn className="size-4" />}
        />
        <KpiCard
          label="Ingresos"
          value={fmt(metrics.totalIncome)}
          sub="Caja del día"
          color="green"
          icon={<DollarSign className="size-4" />}
        />
        <KpiCard
          label="Gastos"
          value={fmt(metrics.totalExpense)}
          sub="Salidas de caja"
          color="red"
          icon={<TrendingDown className="size-4" />}
        />
      </div>

      {/* Balance summary bar */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Balance neto del día
          </p>
          <p
            className={`text-3xl font-black tracking-tight ${
              metrics.totalIncome - metrics.totalExpense >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {fmt(metrics.totalIncome - metrics.totalExpense)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Pendientes
          </p>
          <p className="text-xl font-black text-amber-600">
            {metrics.reservationsPending}
          </p>
          <p className="text-[10px] text-zinc-400">reservas sin confirmar</p>
        </div>
      </div>

      {/* Shift close form */}
      <DailyReportForm clubId={clubId} />
    </div>
  )
}
