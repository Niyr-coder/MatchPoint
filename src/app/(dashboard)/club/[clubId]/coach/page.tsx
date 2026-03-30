import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default async function CoachClassesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Clases hoy", value: "—" },
    { label: "Estudiantes", value: "—" },
    { label: "Ganancias mes", value: "—" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="coach" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoCard
          variant="default"
          icon="BookOpen"
          label="Clases de hoy"
          title="Mi horario"
          subtitle="Clases asignadas para hoy"
          index={0}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Sin clases programadas hoy
            </p>
          </div>
        </BentoCard>

        <BentoCard
          variant="default"
          icon="Users"
          label="Mis estudiantes"
          title="Resumen del mes"
          subtitle="Asistencia y progreso"
          index={1}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
