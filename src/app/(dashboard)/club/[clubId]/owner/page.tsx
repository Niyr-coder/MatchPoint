import { BarChart3, Calendar, DollarSign, Users } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"

export default function OwnerDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="label-green">Dueño del Club</p>
        <h1 className="text-2xl font-black text-white">Dashboard del Club</h1>
        <p className="text-sm text-zinc-400 mt-1">Resumen completo de operaciones y finanzas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ocupación Hoy" value="—" suffix="%" icon={BarChart3} />
        <StatCard label="Ingresos del Día" value="—" suffix="USD" icon={DollarSign} />
        <StatCard label="Usuarios Activos" value="—" icon={Users} />
        <StatCard label="Reservas Hoy" value="—" icon={Calendar} />
      </div>
    </div>
  )
}
