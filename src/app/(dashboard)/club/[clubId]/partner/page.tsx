import { DollarSign, Trophy, Users } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"

export default function PartnerDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="label-green">Socio del Club</p>
        <h1 className="text-2xl font-black text-white">Mi Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Resumen de tus ganancias y actividad</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Mi Comisión (Mes)" value="—" suffix="USD" icon={DollarSign} />
        <StatCard label="Torneos Organizados" value="—" icon={Trophy} />
        <StatCard label="Contactos del Equipo" value="—" icon={Users} />
      </div>
    </div>
  )
}
