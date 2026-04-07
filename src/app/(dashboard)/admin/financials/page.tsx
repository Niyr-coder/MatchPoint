import { authorizeOrRedirect } from "@/features/auth/queries"
import { getAdminFinancials } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { DollarSign, TrendingUp, TrendingDown, Trophy, Building2 } from "lucide-react"

function growthBadge(thisMonth: number, lastMonth: number) {
  if (lastMonth === 0) {
    return thisMonth > 0 ? (
      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
        <TrendingUp className="size-3" /> Nuevo
      </span>
    ) : null
  }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
        <TrendingUp className="size-3" /> +{pct}% vs mes anterior
      </span>
    )
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
        <TrendingDown className="size-3" /> {pct}% vs mes anterior
      </span>
    )
  }
  return (
    <span className="text-xs font-black text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
      Sin cambio
    </span>
  )
}

export default async function AdminFinancialsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const fin = await getAdminFinancials()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · FINANCIERO"
        title="Financiero Global"
        description="Resumen financiero de toda la plataforma"
      />

      {/* Top stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos Totales"
          value={`$${fin.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          label="Ingresos Este Mes"
          value={`$${fin.revenueThisMonth.toFixed(2)}`}
          icon={DollarSign}
          variant="accent"
        />
        <StatCard
          label="Mes Anterior"
          value={`$${fin.revenueLastMonth.toFixed(2)}`}
          icon={DollarSign}
          variant="default"
        />
        <StatCard
          label="Promedio / Reserva"
          value={`$${fin.avgReservationValue.toFixed(2)}`}
          icon={DollarSign}
          variant="default"
        />
      </div>

      {/* Growth badge + secondary stats */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
              Tendencia mensual
            </p>
            <p className="text-2xl font-black text-[#0a0a0a]">
              ${fin.revenueThisMonth.toFixed(2)}
              <span className="text-sm font-bold text-zinc-400 ml-2">este mes</span>
            </p>
          </div>
          {growthBadge(fin.revenueThisMonth, fin.revenueLastMonth)}
        </div>
        <div className="pt-4 border-t border-[#f0f0f0] grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Total reservas
            </p>
            <p className="text-lg font-black text-[#0a0a0a]">{fin.totalReservations}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Reservas este mes
            </p>
            <p className="text-lg font-black text-[#1a56db]">{fin.reservationsThisMonth}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
              Ingresos torneos
            </p>
            <p className="text-lg font-black text-[#16a34a]">${fin.tournamentRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tournament revenue card */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex items-center gap-4">
        <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Trophy className="size-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Ingresos por torneos
          </p>
          <p className="text-xl font-black text-[#0a0a0a]">${fin.tournamentRevenue.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Suma de entry fees de participantes con pago confirmado
          </p>
        </div>
      </div>

      {/* Top clubs by revenue table */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Building2 className="size-4 text-zinc-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Top clubs por ingresos
          </p>
        </div>

        {fin.topClubsByRevenue.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">Sin datos de reservas</p>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-[#f0f0f0] mb-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 col-span-2">Club</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Reservas</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Ingresos</p>
            </div>
            <div className="flex flex-col divide-y divide-[#f0f0f0]">
              {fin.topClubsByRevenue.map((club) => {
                const avg = club.reservations > 0 ? club.revenue / club.reservations : 0
                return (
                  <div key={club.club_id} className="grid grid-cols-4 gap-2 py-3 items-center">
                    <div className="col-span-2">
                      <p className="text-sm font-bold text-[#0a0a0a]">{club.name}</p>
                      <p className="text-[10px] text-zinc-400">Prom. ${avg.toFixed(2)} / reserva</p>
                    </div>
                    <p className="text-sm font-black text-zinc-600 text-right">{club.reservations}</p>
                    <p className="text-sm font-black text-[#16a34a] text-right">${club.revenue.toFixed(2)}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
