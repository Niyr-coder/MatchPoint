import { Calendar, MapPin, Users } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { EmptyState } from "@/components/dashboard/EmptyState"

export default function EmployeeTodayPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="label-green">Vista Diaria</p>
        <h1 className="text-2xl font-black text-white">Hoy</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Reservas de Hoy" value="—" icon={Calendar} />
        <StatCard label="Check-ins" value="—" icon={Users} />
        <StatCard label="Canchas en Uso" value="—" icon={MapPin} />
      </div>

      <section>
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
          Reservas del Día
        </h2>
        <EmptyState
          icon={Calendar}
          title="Sin reservas para hoy"
          description="Las reservas del día aparecerán aquí para hacer check-in."
        />
      </section>
    </div>
  )
}
