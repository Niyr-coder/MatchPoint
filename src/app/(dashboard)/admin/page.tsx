import { Building2, Users, DollarSign, Trophy } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="label-green">Plataforma Global</p>
        <h1 className="text-2xl font-black text-white">Dashboard Global</h1>
        <p className="text-sm text-zinc-400 mt-1">Vista general de toda la plataforma MatchPoint</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clubs Activos" value="—" icon={Building2} />
        <StatCard label="Usuarios Totales" value="—" icon={Users} />
        <StatCard label="Ingresos del Mes" value="—" suffix="USD" icon={DollarSign} />
        <StatCard label="Torneos Activos" value="—" icon={Trophy} />
      </div>
    </div>
  )
}
