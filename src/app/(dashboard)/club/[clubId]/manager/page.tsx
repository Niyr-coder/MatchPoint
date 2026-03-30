import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default async function ManagerTodayPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["manager"] })

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Ocupación", value: "—" },
    { label: "Reservas", value: "—" },
    { label: "Caja del día", value: "—" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="manager" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Reservas de hoy"
          title="Actividad del día"
          subtitle="Check-in de jugadores y canchas activas"
          index={0}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Sin reservas para hoy
            </p>
          </div>
        </BentoCard>

        <BentoCard
          variant="default"
          icon="Wallet"
          label="Caja"
          title="Movimientos del día"
          subtitle="Ingresos y egresos registrados"
          index={1}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Sin movimientos hoy
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
