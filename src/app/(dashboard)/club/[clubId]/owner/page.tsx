import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

const WEEK_BARS = [
  { day: "L", height: 40, reservations: 8 },
  { day: "M", height: 65, reservations: 13 },
  { day: "X", height: 50, reservations: 10 },
  { day: "J", height: 80, reservations: 16 },
  { day: "V", height: 90, reservations: 18 },
  { day: "S", height: 100, reservations: 20 },
  { day: "D", height: 55, reservations: 11 },
]

export default async function OwnerDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const [membersRes, courtsRes, reservationsTodayRes] = await Promise.all([
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("start_time", `${today}T00:00:00`)
      .lte("start_time", `${today}T23:59:59`)
      .neq("status", "cancelled"),
  ])

  const memberCount = membersRes.error ? "—" : String(membersRes.count ?? 0)
  const courtCount = courtsRes.error ? "—" : String(courtsRes.count ?? 0)
  const reservationsToday = reservationsTodayRes.error
    ? "—"
    : String(reservationsTodayRes.count ?? 0)

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Miembros activos", value: memberCount },
    { label: "Canchas activas", value: courtCount },
    { label: "Reservas hoy", value: reservationsToday },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="owner" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly reservations bar chart */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Rendimiento semanal"
          title="Reservas por día"
          subtitle="Últimos 7 días del club"
          index={0}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-end justify-between gap-1.5 h-[80px]">
              {WEEK_BARS.map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-t-sm bg-[#1e40af]"
                    style={{ height: `${bar.height * 0.7}px`, opacity: i === 5 ? 1 : 0.45 + i * 0.08 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between gap-1.5">
              {WEEK_BARS.map((bar, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Active members */}
        <BentoCard
          variant="default"
          icon="Users"
          label="Equipo del club"
          title="Miembros activos"
          subtitle="Entrenadores, empleados y socios"
          index={1}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{memberCount}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                miembros registrados
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-black text-[#1e40af] bg-[#1e40af]/10 px-2 py-0.5 rounded-full">
                Activos
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Active courts */}
        <BentoCard
          variant="default"
          icon="MapPin"
          label="Infraestructura"
          title="Canchas activas"
          subtitle="Canchas disponibles para reservas"
          index={2}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{courtCount}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                canchas en operación
              </p>
            </div>
            <div
              className="size-10 rounded-xl bg-[#1e40af]/10 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-lg">🏟️</span>
            </div>
          </div>
        </BentoCard>

        {/* Today's reservations */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Actividad de hoy"
          title="Reservas del día"
          subtitle={`Reservas activas para ${date}`}
          index={3}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{reservationsToday}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                reservas confirmadas
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">En vivo</span>
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
