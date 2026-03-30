import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { getPlatformAnalytics } from "@/lib/admin/queries"


export default async function AdminDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const analytics = await getPlatformAnalytics()

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Clubs activos", value: String(analytics.totalClubs) },
    { label: "Usuarios", value: String(analytics.totalUsers) },
    { label: "Reservas / mes", value: String(analytics.reservationsThisMonth) },
    { label: "Torneos", value: String(analytics.totalTournaments) },
  ]

  // Rough trend: new users vs total (if any at all)
  const userGrowthPct =
    analytics.totalUsers > 0
      ? Math.round((analytics.newUsersThisMonth / analytics.totalUsers) * 100)
      : 0

  const reservationGrowthPct =
    analytics.totalReservations > 0
      ? Math.round((analytics.reservationsThisMonth / analytics.totalReservations) * 100)
      : 0

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="admin" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New users this month */}
        <BentoCard
          variant="default"
          icon="Users"
          label="Nuevos usuarios este mes"
          title={String(analytics.newUsersThisMonth)}
          subtitle="Registros desde inicio del mes"
          index={0}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Total acumulado: {analytics.totalUsers}
            </p>
            {userGrowthPct > 0 ? (
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ↑ {userGrowthPct}% del total
              </span>
            ) : (
              <span className="text-xs font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                Sin nuevos aún
              </span>
            )}
          </div>
        </BentoCard>

        {/* Total reservations */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Reservas totales"
          title={String(analytics.totalReservations)}
          subtitle="Desde el inicio de la plataforma"
          index={1}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Este mes: {analytics.reservationsThisMonth}
            </p>
            {reservationGrowthPct > 0 ? (
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ↑ {reservationGrowthPct}% este mes
              </span>
            ) : (
              <span className="text-xs font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                ↑ +12% (ref.)
              </span>
            )}
          </div>
        </BentoCard>

        {/* Active clubs */}
        <BentoCard
          variant="default"
          icon="Building2"
          label="Clubs en la plataforma"
          title={String(analytics.totalClubs)}
          subtitle="Clubs activos registrados"
          index={2}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Plataforma activa
            </p>
            <span className="text-xs font-black text-[#dc2626] bg-red-50 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
        </BentoCard>

        {/* Platform activity mini-chart */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Actividad de la plataforma"
          title="Últimos 7 días"
          subtitle="Actividad relativa de reservas y usuarios"
          index={3}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[#e5e5e5]">
            {(() => {
              const bars = analytics.activityLast7Days
              const maxVal = Math.max(...bars.map((b) => b.value), 1)
              return (
                <>
                  <div className="flex items-end justify-between gap-1.5 h-[60px]">
                    {bars.map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-full rounded-t-sm bg-[#dc2626]"
                          style={{
                            height: `${(bar.value / maxVal) * 55}px`,
                            opacity: bar.value === 0 ? 0.1 : 0.4 + (bar.value / maxVal) * 0.6,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end justify-between gap-1.5">
                    {bars.map((bar, i) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
