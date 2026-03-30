import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default async function EmployeeTodayPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Reservas hoy", value: "—" },
    { label: "Check-ins", value: "—" },
    { label: "Canchas en uso", value: "—" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="employee" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Reservas del día"
          title="Jugadores y canchas"
          subtitle="Check-in de jugadores y reservas activas"
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
          icon="MapPin"
          label="Canchas"
          title="Estado de canchas"
          subtitle="Disponibilidad en tiempo real"
          index={1}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Sin datos disponibles
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
