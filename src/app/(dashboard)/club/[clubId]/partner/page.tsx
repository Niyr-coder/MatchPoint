import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default async function PartnerDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["partner"] })

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Comisión mes", value: "—" },
    { label: "Torneos org.", value: "—" },
    { label: "Equipo", value: "—" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="partner" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard
          variant="default"
          icon="DollarSign"
          label="Mi financiero"
          title="Comisión del mes"
          subtitle="Ingresos y participación en el club"
          index={0}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
          </div>
        </BentoCard>

        <BentoCard
          variant="default"
          icon="Trophy"
          label="Torneos"
          title="Mis torneos organizados"
          subtitle="Estado y resultados de tus torneos"
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
