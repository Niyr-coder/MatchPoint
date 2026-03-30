import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { DashboardHeading } from "@/components/dashboard/DashboardHeading"
import { getPlatformAnalytics } from "@/lib/admin/queries"

export default async function AdminDashboardPage() {
  const analytics = await getPlatformAnalytics()

  return (
    <div className="space-y-3">
      <DashboardHeading label="Plataforma Global" title="Dashboard Global" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clubs Activos" value={String(analytics.totalClubs)} icon="Building2" accent index={0} />
        <StatCard label="Usuarios Totales" value={String(analytics.totalUsers)} icon="Users" index={1} />
        <StatCard label="Reservas del Mes" value={String(analytics.reservationsThisMonth)} icon="Calendar" index={2} />
        <StatCard label="Torneos Activos" value={String(analytics.totalTournaments)} icon="Trophy" index={3} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoCard
          variant="default"
          label="Nuevos usuarios"
          title={String(analytics.newUsersThisMonth)}
          subtitle="Registros este mes"
          className="col-span-2"
          index={4}
        >
          <div className="flex items-end justify-between mt-auto pt-4">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Total acumulado: {analytics.totalUsers}
            </p>
          </div>
        </BentoCard>

        <BentoCard
          variant="default"
          label="Reservas totales"
          title={String(analytics.totalReservations)}
          subtitle="Desde el inicio de la plataforma"
          className="col-span-2"
          index={5}
        >
          <div className="flex items-end justify-between mt-auto pt-4">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Este mes: {analytics.reservationsThisMonth}
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
