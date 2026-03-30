import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { PageHeader } from "@/components/shared/PageHeader"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(amount)

// ─── page ────────────────────────────────────────────────────────────────────

export default async function OwnerReportsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // ── Reservations this month ──
  type ResRow = {
    id: string
    date: string
    total_price: number
    status: string
    user_id: string
    courts: { sport: string; name: string } | null
  }

  let reservations: ResRow[] = []
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("id, date, total_price, status, user_id, courts!inner(sport, name)")
      .eq("courts.club_id", clubId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
    if (!error && data) reservations = data as unknown as ResRow[]
  } catch {
    // fallback to empty
  }

  const confirmedRes = reservations.filter((r) => r.status !== "cancelled")

  // Summary stats
  const totalCount = confirmedRes.length
  const totalRevenue = confirmedRes.reduce((sum, r) => sum + (r.total_price ?? 0), 0)
  const uniqueClients = new Set(confirmedRes.map((r) => r.user_id)).size

  // Court usage ranking
  const courtUsage: Record<string, { name: string; count: number }> = {}
  for (const r of confirmedRes) {
    const key = r.courts?.name ?? "Desconocida"
    if (!courtUsage[key]) courtUsage[key] = { name: key, count: 0 }
    courtUsage[key].count += 1
  }
  const courtRanking = Object.values(courtUsage)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxCourtCount = Math.max(...courtRanking.map((c) => c.count), 1)

  // Occupation by day of week (Mon-first)
  const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  const dayBuckets: number[] = [0, 0, 0, 0, 0, 0, 0]
  for (const r of confirmedRes) {
    const jsDay = new Date(r.date).getDay() // 0=Sun…6=Sat
    const idx = jsDay === 0 ? 6 : jsDay - 1 // remap to Mon=0…Sun=6
    dayBuckets[idx] += 1
  }
  const maxDayCount = Math.max(...dayBuckets, 1)

  const monthLabel = new Date(monthStart).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="OWNER · REPORTES"
        title="Reportes del Club"
        description="Análisis de ocupación, ingresos y rendimiento del período"
      />

      {/* Period selector — static UI, current month highlighted */}
      <div className="flex gap-2">
        {(["Esta semana", "Este mes", "Este año"] as const).map((label) => (
          <button
            key={label}
            disabled
            className={`text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border transition-colors ${
              label === "Este mes"
                ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                : "bg-white text-zinc-400 border-[#e5e5e5] cursor-not-allowed"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Period summary */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Resumen"
          title="Resumen del período"
          subtitle={monthLabel}
          index={0}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
            {[
              { label: "Reservas totales", value: String(totalCount) },
              { label: "Clientes únicos", value: String(uniqueClients) },
              { label: "Ingresos brutos", value: fmt(totalRevenue) },
              { label: "Cancha más usada", value: courtRanking[0]?.name ?? "—" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between py-1 border-b border-zinc-50 last:border-0"
              >
                <span className="text-xs text-zinc-500">{stat.label}</span>
                <span className="text-xs font-black text-zinc-800">{stat.value}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Occupation by day of week */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Ocupación"
          title="Reservas por día de semana"
          subtitle="Distribución semanal del mes actual"
          index={1}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-end justify-between gap-1.5 h-[80px]">
              {dayBuckets.map((count, i) => {
                const heightPct = (count / maxDayCount) * 100
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full rounded-t-sm bg-[#1e40af]"
                      style={{
                        height: `${Math.max(heightPct * 0.8, 4)}px`,
                        opacity: count > 0 ? 0.5 + (count / maxDayCount) * 0.5 : 0.15,
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">{label}</span>
                  {dayBuckets[i] > 0 && (
                    <span className="text-[8px] font-bold text-zinc-500">{dayBuckets[i]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Top courts */}
        <BentoCard
          variant="default"
          icon="MapPin"
          label="Infraestructura"
          title="Top canchas"
          subtitle="Ranking por cantidad de reservas"
          index={2}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
            {courtRanking.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">
                Sin datos de canchas este mes
              </p>
            ) : (
              courtRanking.map((court, i) => {
                const pct = Math.round((court.count / maxCourtCount) * 100)
                return (
                  <div key={court.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400">#{i + 1}</span>
                        <span className="text-xs font-bold text-zinc-800">{court.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-500">
                        {court.count} reserva{court.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1e40af]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </BentoCard>

        {/* Export actions */}
        <BentoCard
          variant="default"
          icon="DollarSign"
          label="Exportar"
          title="Acciones del reporte"
          subtitle="Descarga y comparte los datos del período"
          index={3}
        >
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
            {[
              {
                label: "Descargar PDF",
                description: "Genera un reporte completo en formato PDF",
              },
              {
                label: "Exportar CSV",
                description: "Exporta todas las reservas a una hoja de cálculo",
              },
              {
                label: "Compartir reporte",
                description: "Genera un enlace de solo lectura para compartir",
              },
            ].map((action) => (
              <div key={action.label} className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-zinc-800">{action.label}</span>
                  <span className="text-[10px] text-zinc-400 leading-relaxed">
                    {action.description}
                  </span>
                </div>
                <button
                  disabled
                  title="Próximamente"
                  className="shrink-0 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#e5e5e5] text-zinc-300 cursor-not-allowed"
                >
                  Pronto
                </button>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
