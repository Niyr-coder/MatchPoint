import { authorizeOrRedirect } from "@/features/auth/queries"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ClipboardList, CalendarDays, Users, DollarSign } from "lucide-react"

interface Reservation {
  id: string
  start_time: string
  status: string
  courts?: { name: string } | null
}

const QUICK_ACTIONS = [
  { label: "Caja del día",     icon: DollarSign,    path: "cash-register" },
  { label: "Reservas",         icon: CalendarDays,  path: "reservations"  },
  { label: "Clientes",         icon: Users,         path: "clients"       },
  { label: "Reporte diario",   icon: ClipboardList, path: "daily-report"  },
]

export default async function EmployeeTodayPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const [reservationsRes, confirmedRes, courtsRes] = await Promise.all([
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
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("start_time", `${today}T00:00:00`)
      .lte("start_time", `${today}T23:59:59`)
      .eq("status", "confirmed"),
    supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
  ])

  const reservations: Reservation[] = (reservationsRes.data ?? []) as unknown as Reservation[]
  const totalReservations = reservations.length
  const confirmedCount = confirmedRes.error ? "0" : String(confirmedRes.count ?? 0)
  const courtCount = courtsRes.error ? "—" : String(courtsRes.count ?? 0)

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Reservas hoy",    value: String(totalReservations) },
    { label: "Confirmadas",     value: confirmedCount             },
    { label: "Canchas activas", value: courtCount                 },
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
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
            {reservations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  No hay reservas pendientes
                </p>
                <p className="text-[10px] text-muted-foreground/70">
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
                const isConfirmed = r.status === "confirmed"
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full shrink-0 ${isConfirmed ? "bg-primary" : "bg-zinc-400"}`}
                      />
                      <span className="text-xs font-black text-foreground">{time}</span>
                      <span className="text-xs text-muted-foreground">{courtName}</span>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        isConfirmed
                          ? "bg-success text-primary border border-success-border"
                          : "text-muted-foreground bg-muted"
                      }`}
                    >
                      {isConfirmed ? "Confirmada" : "Esperando"}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </BentoCard>

        {/* Quick actions */}
        <BentoCard
          variant="default"
          icon="BookOpen"
          label="Acciones rápidas"
          title="Acceso directo"
          subtitle="Secciones de tu jornada"
          index={1}
        >
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
            {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
              <Link
                key={path}
                href={`/club/${clubId}/employee/${path}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-secondary hover:bg-muted hover:border-foreground/20 transition-colors group"
              >
                <Icon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                <span className="text-[11px] font-black text-foreground uppercase tracking-wide leading-none">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </BentoCard>

        {/* Occupancy overview */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Resumen del día"
          title="Vista rápida"
          subtitle="Ocupación de canchas hoy"
          index={2}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-foreground leading-none tabular-nums">
                  {totalReservations}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  reservas activas
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-primary leading-none tabular-nums">
                  {confirmedCount}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  confirmadas
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: totalReservations > 0 ? `${Math.min(100, totalReservations * 10)}%` : "2%" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {courtCount} canchas disponibles
            </p>
          </div>
        </BentoCard>

        {/* Today's detail */}
        <BentoCard
          variant="default"
          icon="Star"
          label="Estado del día"
          title="Resumen de turno"
          subtitle="Métricas clave de la jornada"
          index={3}
        >
          <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border">
            {[
              {
                label: "Total reservas",
                value: String(totalReservations),
                color: "text-foreground",
              },
              {
                label: "Confirmadas",
                value: confirmedCount,
                color: "text-primary",
              },
              {
                label: "Pendientes",
                value: String(totalReservations - Number(confirmedCount)),
                color: "text-amber-600",
              },
              {
                label: "Canchas activas",
                value: courtCount,
                color: "text-foreground",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-secondary">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className={`text-sm font-black tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
