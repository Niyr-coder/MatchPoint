import { authorizeOrRedirect } from "@/features/auth/queries"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

const MONTH_LABELS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"] as const

const fmt = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n)

export default async function PartnerDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["partner"] })

  const supabase = await createClient()
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split("T")[0]

  const [tournamentsRes, membersRes, monthlyRes, revenueRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("reservations")
      .select("start_time")
      .eq("club_id", clubId)
      .gte("start_time", sixMonthsAgo.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("reservations")
      .select("total_price")
      .eq("club_id", clubId)
      .gte("start_time", `${currentMonthStart}T00:00:00`)
      .eq("status", "confirmed"),
  ])

  // Build 6-month activity bars
  const countByMonth = new Map<string, number>()
  for (const r of monthlyRes.data ?? []) {
    const d = new Date(r.start_time)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1)
  }
  const rawMonthBars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    return { month: MONTH_LABELS_ES[d.getMonth()], count: countByMonth.get(key) ?? 0 }
  })
  const maxMonth = Math.max(...rawMonthBars.map((b) => b.count), 1)
  const activityBars = rawMonthBars.map((b) => ({ ...b, value: Math.round((b.count / maxMonth) * 100) }))

  // Monthly revenue from confirmed reservations
  const monthlyRevenue = (revenueRes.data ?? []).reduce(
    (sum, r) => sum + ((r as { total_price: number | null }).total_price ?? 0),
    0
  )
  const monthlyReservationCount = revenueRes.error ? 0 : (revenueRes.data?.length ?? 0)

  const tournamentCount = tournamentsRes.error ? "—" : String(tournamentsRes.count ?? 0)
  const teamCount = membersRes.error ? "—" : String(membersRes.count ?? 0)

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Ingresos mes",  value: fmt(monthlyRevenue) },
    { label: "Torneos",       value: tournamentCount      },
    { label: "Equipo",        value: teamCount            },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="partner" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Club revenue this month */}
        <BentoCard
          variant="default"
          icon="DollarSign"
          label="Ingresos del club"
          title="Este mes"
          subtitle="Reservas confirmadas en el período"
          index={0}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-border">
            <div>
              <p className="text-3xl font-black text-foreground leading-none tabular-nums">
                {fmt(monthlyRevenue)}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                {monthlyReservationCount} reserva{monthlyReservationCount !== 1 ? "s" : ""} confirmada{monthlyReservationCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-black text-primary bg-success border border-success-border px-2 py-0.5 rounded-full">
                Socio activo
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Tournament count */}
        <BentoCard
          variant="default"
          icon="Trophy"
          label="Torneos"
          title="Torneos organizados"
          subtitle="Torneos del club en la plataforma"
          index={1}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-border">
            <div>
              <p className="text-4xl font-black text-foreground leading-none tabular-nums">{tournamentCount}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                torneos registrados
              </p>
            </div>
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center" aria-hidden="true">
              <span className="text-lg">🏆</span>
            </div>
          </div>
        </BentoCard>

        {/* Monthly activity chart — real reservation data */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Actividad mensual"
          title="Reservas por mes"
          subtitle="Últimos 6 meses del club"
          index={2}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border">
            <div className="flex items-end justify-between gap-1.5 h-[60px]">
              {activityBars.map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-t-sm bg-primary"
                    style={{
                      height: `${bar.value * 0.55}px`,
                      opacity: i === activityBars.length - 1 ? 1 : 0.25 + i * 0.12,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between gap-1.5">
              {activityBars.map((bar, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Team overview */}
        <BentoCard
          variant="default"
          icon="Users"
          label="Equipo del club"
          title="Vista general"
          subtitle="Miembros activos registrados"
          index={3}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-border">
            <div>
              <p className="text-4xl font-black text-foreground leading-none tabular-nums">{teamCount}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                miembros en el club
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Activos</span>
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
