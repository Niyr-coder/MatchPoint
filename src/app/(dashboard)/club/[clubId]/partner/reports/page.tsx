import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { FileBarChart, DollarSign, Calendar } from "lucide-react"

interface ReservationRow {
  id: string
  date: string
  total_price: number | null
  sport: string | null
}

type RawReservation = {
  id: string
  date: string
  total_price: number | null
  courts: { club_id: string; sport: string } | Array<{ club_id: string; sport: string }> | null
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

export default async function PartnerReportsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["partner", "owner"] })

  const supabase = await createServiceClient()

  const { data: rawReservations } = await supabase
    .from("reservations")
    .select(`
      id,
      date,
      total_price,
      courts!inner ( club_id, sport )
    `)
    .eq("courts.club_id", clubId)
    .neq("status", "cancelled")

  const reservations: ReservationRow[] = (rawReservations as unknown as RawReservation[] ?? []).map((r) => {
    const court = Array.isArray(r.courts) ? r.courts[0] : r.courts
    return {
      id: r.id,
      date: r.date,
      total_price: r.total_price,
      sport: (court as { sport: string } | null)?.sport ?? null,
    }
  })

  const totalRevenue = reservations.reduce((sum, r) => sum + (r.total_price ?? 0), 0)
  const totalReservations = reservations.length

  const sportMap = new Map<string, { count: number; revenue: number }>()
  for (const r of reservations) {
    const key = r.sport ?? "other"
    const existing = sportMap.get(key) ?? { count: 0, revenue: 0 }
    sportMap.set(key, {
      count: existing.count + 1,
      revenue: existing.revenue + (r.total_price ?? 0),
    })
  }

  const sportBreakdown = Array.from(sportMap.entries())
    .map(([sport, data]) => ({ sport, ...data }))
    .sort((a, b) => b.count - a.count)

  const topSport = sportBreakdown[0] ?? null

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="SOCIO · REPORTES"
        title="Reportes del Club"
        description="Actividad y estadísticas generales del club"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Ingresos Totales"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          label="Total Reservas"
          value={totalReservations}
          icon={Calendar}
          variant="default"
        />
        <StatCard
          label="Deporte Top"
          value={topSport ? (SPORT_LABELS[topSport.sport] ?? topSport.sport) : "—"}
          icon={FileBarChart}
          variant="accent"
        />
      </div>

      {sportBreakdown.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="Sin datos disponibles"
          description="Aún no hay reservas registradas para generar reportes."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
            Desglose por deporte
          </p>
          {sportBreakdown.map(({ sport, count, revenue }) => (
            <div
              key={sport}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <p className="text-sm font-black text-[#0a0a0a]">
                {SPORT_LABELS[sport] ?? sport}
              </p>
              <div className="flex items-center gap-6 text-[11px] text-zinc-500">
                <span>
                  <span className="font-bold text-[#0a0a0a]">{count}</span> reservas
                </span>
                <span>
                  <span className="font-bold text-[#16a34a]">${revenue.toFixed(2)}</span> ingresos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
