import { authorizeOrRedirect } from "@/features/auth/queries"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#16a34a",
  pending: "#d97706",
  cancelled: "#dc2626",
  completed: "#6b7280",
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
}

interface Reservation {
  id: string
  start_time: string
  status: string
  courts?: { name: string } | null
}

export default async function ManagerTodayPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const [reservationsRes, courtsRes, cashRes] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, start_time, status, courts(name)")
      .eq("club_id", clubId)
      .gte("start_time", `${today}T00:00:00`)
      .lte("start_time", `${today}T23:59:59`)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true })
      .limit(5),
    supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("cash_register_entries")
      .select("amount")
      .eq("club_id", clubId)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`),
  ])

  const reservations: Reservation[] = (reservationsRes.data ?? []) as unknown as Reservation[]
  const totalReservations = reservations.length
  const courtCount = courtsRes.error ? 0 : (courtsRes.count ?? 0)
  const occupancyPct = courtCount > 0 ? Math.min(100, Math.round((totalReservations / (courtCount * 8)) * 100)) : 0

  const cashTotal = cashRes.error || !cashRes.data
    ? null
    : cashRes.data.reduce((sum: number, row: { amount: number }) => sum + (row.amount ?? 0), 0)

  const cashDisplay = cashTotal !== null ? `$${cashTotal.toFixed(2)}` : "$0.00"

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Ocupación", value: `${occupancyPct}%` },
    { label: "Reservas", value: String(totalReservations) },
    { label: "Caja del día", value: cashDisplay },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="manager" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's reservations list */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Reservas de hoy"
          title="Actividad del día"
          subtitle="Próximas reservas confirmadas"
          index={0}
        >
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e5e5e5]">
            {reservations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <span className="text-2xl">📅</span>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Sin reservas para hoy
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
                const color = STATUS_COLORS[r.status] ?? "#6b7280"
                const statusLabel = STATUS_LABELS[r.status] ?? r.status
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-black text-[#0a0a0a]">{time}</span>
                      <span className="text-xs text-zinc-500">{courtName}</span>
                    </div>
                    <span
                      className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </BentoCard>

        {/* Cash register */}
        <BentoCard
          variant="default"
          icon="Wallet"
          label="Caja del día"
          title="Total registrado"
          subtitle="Movimientos de hoy"
          index={1}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-3xl font-black text-[#0a0a0a] leading-none">{cashDisplay}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                ingresos del día
              </p>
            </div>
            {cashTotal !== null && cashTotal > 0 ? (
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ↑ Activo
              </span>
            ) : (
              <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                Sin movimientos
              </span>
            )}
          </div>
        </BentoCard>

        {/* Occupancy bar */}
        <BentoCard
          variant="default"
          icon="Activity"
          label="Ocupación"
          title="Canchas en uso"
          subtitle="Porcentaje de ocupación hoy"
          index={2}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-[#0a0a0a]">{occupancyPct}%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {totalReservations}/{courtCount * 8} turnos
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#16a34a] transition-all"
                style={{ width: `${Math.max(occupancyPct, 2)}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] text-zinc-400 font-bold uppercase">0%</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase">100%</span>
            </div>
          </div>
        </BentoCard>

        {/* Quick actions */}
        <BentoCard
          variant="default"
          icon="Plus"
          label="Acciones rápidas"
          title="Gestión del día"
          subtitle="Accesos directos frecuentes"
          index={3}
        >
          <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#e5e5e5] px-3 py-2.5 cursor-default hover:bg-zinc-50 transition-colors">
                <span className="text-sm">📋</span>
                <span className="text-[11px] font-black text-[#0a0a0a] uppercase tracking-wide">
                  Nueva Reserva
                </span>
              </div>
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#e5e5e5] px-3 py-2.5 cursor-default hover:bg-zinc-50 transition-colors">
                <span className="text-sm">💰</span>
                <span className="text-[11px] font-black text-[#0a0a0a] uppercase tracking-wide">
                  Registrar Pago
                </span>
              </div>
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
