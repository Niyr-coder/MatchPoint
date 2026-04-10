import { authorizeOrRedirect } from "@/features/auth/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(amount)

// ─── page ────────────────────────────────────────────────────────────────────

export default async function ManagerReportsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager", "owner"] })

  const supabase = await createClient()

  const now = new Date()
  const today = now.toISOString().split("T")[0]

  // Week boundaries (Mon–Sun)
  const dayOfWeek = now.getDay() // 0=Sun
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMon)
  const weekStartStr = weekStart.toISOString().split("T")[0]

  // Previous week
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(weekStart.getDate() - 7)
  const prevWeekEnd = new Date(weekStart)
  prevWeekEnd.setDate(weekStart.getDate() - 1)
  const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0]
  const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0]

  // ── Queries ──
  type ResRow = {
    id: string
    date: string
    start_time: string
    end_time: string
    total_price: number
    status: string
    courts: { name: string; sport: string } | null
  }

  const [todayRes, weekRes, prevWeekRes, upcomingRes, cashRes] = await Promise.all([
    // Today's reservations
    supabase
      .from("reservations")
      .select("id, date, start_time, end_time, total_price, status, courts!inner(name, sport)")
      .eq("courts.club_id", clubId)
      .eq("date", today)
      .order("start_time", { ascending: true })
      .then(({ data, error }) =>
        error ? [] : (data as unknown as ResRow[])
      ),

    // This week's reservations
    supabase
      .from("reservations")
      .select("id, date, total_price, status, courts!inner(name)")
      .eq("courts.club_id", clubId)
      .gte("date", weekStartStr)
      .lte("date", today)
      .then(({ data, error }) =>
        error ? [] : (data as unknown as ResRow[])
      ),

    // Previous week's confirmed count
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("courts.club_id", clubId)
      .gte("date", prevWeekStartStr)
      .lte("date", prevWeekEndStr)
      .neq("status", "cancelled")
      .then(({ count, error }) => (error ? 0 : (count ?? 0))),

    // Upcoming reservations (next 5 from now)
    supabase
      .from("reservations")
      .select("id, date, start_time, end_time, status, courts!inner(name, sport)")
      .eq("courts.club_id", clubId)
      .gte("date", today)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(5)
      .then(({ data, error }) =>
        error ? [] : (data as unknown as ResRow[])
      ),

    // Today's cash entries
    supabase
      .from("cash_register_entries")
      .select("type, amount")
      .eq("club_id", clubId)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
      .then(({ data, error }) =>
        error ? [] : (data as { type: string; amount: number }[])
      ),
  ])

  // Compute today stats
  const todayConfirmed = todayRes.filter((r) => r.status !== "cancelled")
  const todayCash = cashRes
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)

  // Courts query for occupancy estimate
  let totalCourts = 0
  try {
    const { count } = await supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true)
    totalCourts = count ?? 0
  } catch {
    // ignore
  }

  // Simple occupancy: today's reserved slots / (courts * 12 business hours)
  const dailySlots = totalCourts * 12
  const occupiedSlots = todayConfirmed.length
  const occupancyPct =
    dailySlots > 0 ? Math.min(Math.round((occupiedSlots / dailySlots) * 100), 100) : 0

  // This week Mon-Fri mini chart
  const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie"]
  const weekDayBuckets: number[] = [0, 0, 0, 0, 0]
  for (const r of weekRes) {
    if (r.status === "cancelled") continue
    const jsDay = new Date(r.date).getDay() // 0=Sun
    const idx = jsDay === 0 ? -1 : jsDay - 1 // Mon=0…Fri=4
    if (idx >= 0 && idx < 5) weekDayBuckets[idx] += 1
  }
  const maxWeekDay = Math.max(...weekDayBuckets, 1)

  const thisWeekConfirmed = weekRes.filter((r) => r.status !== "cancelled").length
  const prevWeekCount = typeof prevWeekRes === "number" ? prevWeekRes : 0
  const weekDiff =
    prevWeekCount > 0
      ? Math.round(((thisWeekConfirmed - prevWeekCount) / prevWeekCount) * 100)
      : null

  // Pending reservations (alert)
  const pendingToday = todayRes.filter((r) => r.status === "pending")

  const SPORT_LABELS: Record<string, string> = {
    futbol: "Fútbol",
    padel: "Pádel",
    tenis: "Tenis",
    pickleball: "Pickleball",
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="MANAGER · REPORTES"
        title="Reportes Operativos"
        description={`Operaciones del club — ${now.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today at the club */}
        <BentoCard
          variant="default"
          icon="Activity"
          label="Hoy"
          title="Hoy en el club"
          subtitle={`${today} — Actividad en tiempo real`}
          index={0}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
            {[
              { label: "Reservas del día", value: String(todayConfirmed.length) },
              {
                label: "Ocupación actual",
                value: `${occupancyPct}%`,
                highlight: occupancyPct > 70,
              },
              { label: "Caja del día", value: fmt(todayCash) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between py-1 border-b border-zinc-50 last:border-0"
              >
                <span className="text-xs text-zinc-500">{stat.label}</span>
                <span
                  className={`text-sm font-black ${stat.highlight ? "text-green-600" : "text-zinc-800"}`}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* This week */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Esta semana"
          title="Esta semana"
          subtitle="Lunes a viernes — reservas confirmadas"
          index={1}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
            <div className="flex items-end justify-between gap-1.5 h-[60px]">
              {weekDayBuckets.map((count, i) => {
                const heightPct = (count / maxWeekDay) * 100
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full rounded-t-sm bg-foreground"
                      style={{
                        height: `${Math.max(heightPct * 0.6, 4)}px`,
                        opacity: count > 0 ? 0.5 + (count / maxWeekDay) * 0.5 : 0.15,
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-1.5">
              {WEEK_DAYS.map((label, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">{label}</span>
                  {weekDayBuckets[i] > 0 && (
                    <span className="text-[8px] font-bold text-zinc-500">{weekDayBuckets[i]}</span>
                  )}
                </div>
              ))}
            </div>
            {weekDiff !== null && (
              <p
                className={`text-xs font-black text-center pt-1 ${
                  weekDiff >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {weekDiff >= 0 ? "↑" : "↓"} {Math.abs(weekDiff)}% vs semana pasada
              </p>
            )}
          </div>
        </BentoCard>

        {/* Operational alerts */}
        <BentoCard
          variant="default"
          icon="MapPin"
          label="Alertas"
          title="Alertas operativas"
          subtitle="Situaciones que requieren atención"
          index={2}
        >
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
            {pendingToday.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">
                Sin alertas operativas hoy
              </p>
            ) : (
              pendingToday.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-zinc-50 last:border-0"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-800 truncate">
                      {r.courts?.name ?? "Cancha"} — sin confirmar
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Pendiente
                  </span>
                </div>
              ))
            )}
          </div>
        </BentoCard>

        {/* Upcoming reservations */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Próximas"
          title="Próximas reservas"
          subtitle="Las 5 reservas más cercanas"
          index={3}
        >
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
            {upcomingRes.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">
                No hay reservas próximas
              </p>
            ) : (
              upcomingRes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-zinc-50 last:border-0"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-800 truncate">
                      {SPORT_LABELS[r.courts?.sport ?? ""] ?? r.courts?.name ?? "Cancha"}
                      {r.courts?.name ? ` · ${r.courts.name}` : ""}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(r.date).toLocaleDateString("es-EC", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      — {r.start_time?.slice(0, 5)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      r.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status === "confirmed" ? "Confirmada" : "Pendiente"}
                  </span>
                </div>
              ))
            )}
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
