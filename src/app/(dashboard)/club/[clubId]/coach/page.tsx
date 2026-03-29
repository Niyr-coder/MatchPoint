import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { BookOpen, DollarSign, Star, Users } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { EmptyState } from "@/components/dashboard/EmptyState"

export default async function CoachClassesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })
  const firstName = ctx.profile.first_name ?? "Entrenador"

  return (
    <div>
      <div className="mb-6">
        <p className="label-green">Mi Panel</p>
        <h1 className="text-2xl font-black text-white">Hola, {firstName}</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Clases Hoy" value="—" icon={BookOpen} />
        <StatCard label="Mis Estudiantes" value="—" icon={Users} />
        <StatCard label="Mi Rating" value="—" suffix="/ 5" icon={Star} />
        <StatCard label="Ganancias (Mes)" value="—" suffix="USD" icon={DollarSign} />
      </div>

      <section>
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Clases de Hoy
        </h2>
        <EmptyState
          icon={BookOpen}
          title="Sin clases programadas hoy"
          description="Tu horario de clases asignadas aparecerá aquí."
        />
      </section>
    </div>
  )
}
