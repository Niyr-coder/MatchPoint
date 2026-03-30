import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default async function OwnerDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Ingresos hoy", value: "—" },
    { label: "Reservas hoy", value: "—" },
    { label: "Ocupación", value: "—" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="owner" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="Rendimiento semanal"
          title="Reservas e ingresos"
          subtitle="Evolución de la semana"
          index={0}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
            <div className="flex items-end gap-1.5">
              {[4, 6, 3, 8, 5, 7, 9].map((h, i) => (
                <div key={i} className="w-2 rounded-sm bg-[#1e40af]/30" style={{ height: `${h * 5}px` }} />
              ))}
            </div>
          </div>
        </BentoCard>

        <BentoCard
          variant="default"
          icon="Users"
          label="Equipo del club"
          title="Miembros activos"
          subtitle="Entrenadores, empleados y socios"
          index={1}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
