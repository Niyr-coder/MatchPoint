import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { DashboardHeading } from "@/components/dashboard/DashboardHeading"

export default async function CoachClassesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })
  const firstName = ctx.profile.first_name ?? "Entrenador"
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="space-y-3">
      <DashboardHeading label="Mi Panel" title={`Hola, ${firstName}.`} subtitle={date} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense">

        {/* Clases hoy — accent tall */}
        <BentoCard
          variant="accent"
          icon="BookOpen"
          label="01"
          title="Clases Hoy"
          className="row-span-2 lg:col-span-1"
          index={0}
        >
          <div className="flex flex-col justify-between flex-1 pt-2">
            <p
              className="font-black text-[#0a0a0a] leading-none tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}
            >
              —
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-auto">
              Clases programadas
            </p>
          </div>
        </BentoCard>

        {/* Estudiantes */}
        <StatCard label="Mis Estudiantes" value="—" icon="Users" index={1} />

        {/* Ganancias */}
        <StatCard label="Ganancias (Mes)" value="—" suffix="USD" icon="DollarSign" index={2} />

        {/* Clases de Hoy — full width */}
        <BentoCard
          variant="default"
          icon="BookOpen"
          label="02"
          title="Clases de Hoy"
          subtitle="Tu horario de clases asignadas"
          className="col-span-2 lg:col-span-3"
          index={3}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Sin clases programadas hoy
            </p>
          </div>
        </BentoCard>

      </div>
    </div>
  )
}
