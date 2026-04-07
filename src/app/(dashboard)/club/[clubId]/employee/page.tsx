import { authorizeOrRedirect } from "@/features/auth/queries"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

const PENDING_TASKS = [
  { label: "Verificar estado de canchas", done: false },
  { label: "Revisar reservas pendientes", done: false },
  { label: "Registrar apertura de caja", done: true },
]

interface Reservation {
  id: string
  start_time: string
  status: string
  courts?: { name: string } | null
}

export default async function EmployeeTodayPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const [reservationsRes, courtsRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, start_time, status, courts(name)")
      .eq("club_id", clubId)
      .gte("start_time", `${today}T00:00:00`)
      .lte("start_time", `${today}T23:59:59`)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true })
      .limit(4),
    supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
  ])

  const reservations: Reservation[] = (reservationsRes.data ?? []) as unknown as Reservation[]
  const totalReservations = reservations.length
  const courtCount = courtsRes.error ? "—" : String(courtsRes.count ?? 0)

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Reservas hoy", value: String(totalReservations) },
    { label: "Check-ins", value: "0" },
    { label: "Canchas activas", value: courtCount },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="employee" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in list */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Check-in del día"
          title="Jugadores esperados"
          subtitle="Reservas activas para hoy"
          index={0}
        >
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e5e5e5]">
            {reservations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="text-2xl">📭</span>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  No hay check-ins pendientes
                </p>
                <p className="text-[10px] text-zinc-300">
                  Las reservas de hoy aparecerán aquí
                </p>
              </div>
            ) : (
              reservations.map((r) => {
                const time = new Date(r.start_time).toLocaleTimeString("es-EC", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
                const courtName = (r.courts as { name: string } | null)?.name ?? "—"
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-zinc-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-zinc-300 shrink-0" />
                      <span className="text-xs font-black text-[#0a0a0a]">{time}</span>
                      <span className="text-xs text-zinc-500">{courtName}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                      Esperando
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </BentoCard>

        {/* Open/close shift */}
        <BentoCard
          variant="default"
          icon="Activity"
          label="Turno de trabajo"
          title="Control de turno"
          subtitle="Apertura y cierre de jornada"
          index={1}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado</p>
                <p className="text-sm font-black text-emerald-600 uppercase">Turno abierto</p>
              </div>
              <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 cursor-default">
                <span className="text-sm">🟢</span>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">Abrir turno</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] bg-zinc-50 px-3 py-2 cursor-default">
                <span className="text-sm">🔴</span>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Cerrar turno</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Quick reservations overview */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Resumen del día"
          title="Vista rápida"
          subtitle="Ocupación de canchas hoy"
          index={2}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-[#0a0a0a]">{totalReservations}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">reservas activas</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-400"
                style={{ width: totalReservations > 0 ? `${Math.min(100, totalReservations * 10)}%` : "2%" }}
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              {courtCount} canchas disponibles
            </p>
          </div>
        </BentoCard>

        {/* Pending tasks */}
        <BentoCard
          variant="default"
          icon="Star"
          label="Tareas pendientes"
          title="Lista del día"
          subtitle="Actividades de la jornada"
          index={3}
        >
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e5e5e5]">
            {PENDING_TASKS.map((task, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-zinc-50">
                <div
                  className="size-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: task.done ? "#16a34a" : "#d4d4d8",
                    backgroundColor: task.done ? "#16a34a" : "transparent",
                  }}
                >
                  {task.done && <span className="text-[8px] text-white font-black">✓</span>}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: task.done ? "#a1a1aa" : "#0a0a0a",
                    textDecoration: task.done ? "line-through" : "none",
                  }}
                >
                  {task.label}
                </span>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
