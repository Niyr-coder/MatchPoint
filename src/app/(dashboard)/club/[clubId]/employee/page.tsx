import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { DashboardHeading } from "@/components/dashboard/DashboardHeading"

export default function EmployeeTodayPage() {
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="space-y-3">
      <DashboardHeading label="Vista Diaria" title="Hoy" subtitle={date} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Reservas de Hoy" value="—" icon="Calendar" accent className="col-span-2 lg:col-span-2" index={0} />
        <StatCard label="Check-ins" value="—" icon="Users" index={1} />
        <StatCard label="Canchas en Uso" value="—" icon="MapPin" index={2} />

        <BentoCard
          variant="default"
          icon="Calendar"
          label="02"
          title="Reservas del Día"
          subtitle="Check-in de jugadores y reservas activas"
          className="col-span-2 lg:col-span-4"
          index={3}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <p className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">
              Sin reservas para hoy
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
