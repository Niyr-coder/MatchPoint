import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense">

      {/* Greeting — dark hero */}
      <BentoCard
        variant="dark"
        className="col-span-2 lg:col-span-2 lg:row-span-2"
        index={0}
      >
        <div className="flex flex-col justify-between h-full py-2 min-h-[200px]">
          <p className="label-green">Mi Panel</p>
          <div>
            <h1
              className="font-black text-white uppercase leading-[0.88] tracking-[-0.03em]"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              Hola, {firstName}.
            </h1>
            <p className="mt-2 text-white/40 text-sm capitalize">{date}</p>
          </div>
        </div>
      </BentoCard>

      {/* Clases hoy — accent tall */}
      <BentoCard
        variant="accent"
        icon="BookOpen"
        label="01"
        title="Clases Hoy"
        className="row-span-2 lg:col-span-1"
        index={1}
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
      <StatCard label="Mis Estudiantes" value="—" icon="Users" index={2} />

      {/* Ganancias */}
      <StatCard label="Ganancias (Mes)" value="—" suffix="USD" icon="DollarSign" index={3} />

      {/* Clases de Hoy — full width */}
      <BentoCard
        variant="dark"
        icon="BookOpen"
        label="02"
        title="Clases de Hoy"
        subtitle="Tu horario de clases asignadas"
        className="col-span-2 lg:col-span-4"
        index={4}
      >
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
            Sin clases programadas hoy
          </p>
        </div>
      </BentoCard>

    </div>
  )
}
