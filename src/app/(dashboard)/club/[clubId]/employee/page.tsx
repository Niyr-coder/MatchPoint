import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default function EmployeeTodayPage() {
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="space-y-3">
      <div className="pb-6 mb-2 border-b border-[#e5e5e5]">
        <p className="label-green mb-1">Vista Diaria</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
          <h1
            className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            Hoy
          </h1>
          <p className="text-sm font-medium text-zinc-400 capitalize sm:pb-1">{date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Reservas de Hoy" value="—" icon="Calendar" accent className="col-span-2 lg:col-span-2" index={0} />
        <StatCard label="Check-ins" value="—" icon="Users" index={1} />
        <StatCard label="Canchas en Uso" value="—" icon="MapPin" index={2} />

        <BentoCard
          variant="dark"
          icon="Calendar"
          label="02"
          title="Reservas del Día"
          subtitle="Check-in de jugadores y reservas activas"
          className="col-span-2 lg:col-span-4"
          index={3}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              Sin reservas para hoy
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
