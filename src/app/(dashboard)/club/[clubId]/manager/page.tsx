import { BarChart3, Calendar, Users, Wallet } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { EmptyState } from "@/components/dashboard/EmptyState"

export default function ManagerTodayPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="label-green">Vista Operativa</p>
        <h1 className="text-2xl font-black text-white">Hoy</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Ocupación" value="—" suffix="%" icon={BarChart3} />
        <StatCard label="Reservas" value="—" icon={Calendar} />
        <StatCard label="Check-ins" value="—" icon={Users} />
        <StatCard label="Caja del Día" value="—" suffix="USD" icon={Wallet} />
      </div>

      <section>
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Próximas Acciones
        </h2>
        <EmptyState
          icon={Calendar}
          title="Sin acciones pendientes"
          description="Las clases, mantenimientos y torneos de hoy aparecerán aquí."
        />
      </section>
    </div>
  )
}
