import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getPlatformAnalytics } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { Users, Building2, Calendar, Trophy, BarChart3 } from "lucide-react"

export default async function AdminAnalyticsPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const analytics = await getPlatformAnalytics()

  const allZero =
    analytics.totalUsers === 0 &&
    analytics.totalClubs === 0 &&
    analytics.totalReservations === 0 &&
    analytics.totalTournaments === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Inteligencia" title="Analytics de la Plataforma" />

      {allZero ? (
        <EmptyState
          icon={BarChart3}
          title="Sin datos suficientes"
          description="Aún no hay datos suficientes para el análisis"
        />
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Usuarios"
              value={analytics.totalUsers}
              icon={Users}
              variant="default"
            />
            <StatCard
              label="Clubs Activos"
              value={analytics.totalClubs}
              icon={Building2}
              variant="accent"
            />
            <StatCard
              label="Reservas del Mes"
              value={analytics.reservationsThisMonth}
              icon={Calendar}
              variant="success"
            />
            <StatCard
              label="Torneos Totales"
              value={analytics.totalTournaments}
              icon={Trophy}
              variant="default"
            />
            <StatCard
              label="Nuevos Este Mes"
              value={analytics.newUsersThisMonth}
              icon={Users}
              variant="success"
            />
            <StatCard
              label="Reservas Este Mes"
              value={analytics.reservationsThisMonth}
              icon={Calendar}
              variant="accent"
            />
          </div>

          {/* Summary card */}
          <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Resumen
            </p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              El sistema tiene{" "}
              <span className="font-black text-[#0a0a0a]">
                {analytics.totalUsers}
              </span>{" "}
              usuarios registrados en{" "}
              <span className="font-black text-[#0a0a0a]">
                {analytics.totalClubs}
              </span>{" "}
              clubs con{" "}
              <span className="font-black text-[#0a0a0a]">
                {analytics.totalReservations}
              </span>{" "}
              reservas realizadas.
            </p>
            <div className="mt-4 pt-4 border-t border-[#f0f0f0] grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
                  Nuevos usuarios este mes
                </p>
                <p className="text-xl font-black text-[#16a34a]">
                  +{analytics.newUsersThisMonth}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
                  Reservas este mes
                </p>
                <p className="text-xl font-black text-[#1a56db]">
                  {analytics.reservationsThisMonth}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
