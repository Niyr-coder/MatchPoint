import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { DailyReportForm } from "@/components/dashboard/DailyReportForm"
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

// ─── page ────────────────────────────────────────────────────────────────────

export default async function EmployeeDailyReportPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee", "manager", "owner"] })

  const supabase = await createClient()

  const now = new Date()
  const today = now.toISOString().split("T")[0]

  const dateLabel = now.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // ── Today's reservations ──
  type ResRow = { id: string; total_price: number; status: string }
  let todayReservations: ResRow[] = []
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, total_price, status, courts!inner(club_id)")
      .eq("courts.club_id", clubId)
      .eq("date", today)
    if (!error && data) todayReservations = data as unknown as ResRow[]
  } catch {
    // fallback
  }

  const confirmedToday = todayReservations.filter((r) => r.status !== "cancelled")
  const processedCount = confirmedToday.length
  const collectedRevenue = confirmedToday.reduce((sum, r) => sum + (r.total_price ?? 0), 0)

  // ── Today's cash entries (check-ins as income entries) ──
  let checkInCount = 0
  try {
    const { count, error } = await supabase
      .from("cash_register_entries")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("type", "income")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
    if (!error) checkInCount = count ?? 0
  } catch {
    // fallback
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="EMPLEADO · REPORTE DIARIO"
        title="Reporte del Día"
        description={dateLabel}
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Reservas procesadas"
          value={String(processedCount)}
          sub="Confirmadas hoy"
          color="blue"
        />
        <KpiCard
          label="Ingresos cobrados"
          value={fmt(collectedRevenue)}
          sub="Total del día"
          color="green"
        />
        <KpiCard
          label="Check-ins realizados"
          value={String(checkInCount)}
          sub="Entradas registradas"
          color="zinc"
        />
      </div>

      {/* Form */}
      <DailyReportForm clubId={clubId} />
    </div>
  )
}
