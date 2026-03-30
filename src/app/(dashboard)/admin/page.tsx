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

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="admin" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard
          variant="default"
          label="Nuevos usuarios este mes"
          title={String(analytics.newUsersThisMonth)}
          subtitle="Registros desde inicio del mes"
          index={0}
        >
          <div className="mt-auto pt-4">
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
          index={1}
        >
          <div className="mt-auto pt-4">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
              Este mes: {analytics.reservationsThisMonth}
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
