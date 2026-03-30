import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { DashboardHeading } from "@/components/dashboard/DashboardHeading"

export default function ManagerTodayPage() {
  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="space-y-3">
      <DashboardHeading label="Vista Operativa" title="Hoy" subtitle={date} />

      {/* Bento grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Row 1: Stat cards */}
        <StatCard label="Ocupación" value="—" suffix="%" icon="BarChart3" accent index={0} />
        <StatCard label="Reservas" value="—" icon="Calendar" index={1} />
        <StatCard label="Check-ins" value="—" icon="Users" index={2} />
        <StatCard label="Caja del Día" value="—" suffix="USD" icon="Wallet" index={3} />

        {/* Row 2: Full-width actions card */}
        <BentoCard
          variant="dark"
          icon="Calendar"
          label="02"
          title="Próximas Acciones"
          subtitle="Clases, mantenimientos y torneos de hoy"
          className="col-span-2 lg:col-span-4"
          index={4}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              Sin acciones pendientes
            </p>
            <a href="#" className="btn-pill-sm bg-white/10 text-white hover:bg-white/20 border-0">
              Agregar acción
            </a>
          </div>
        </BentoCard>

      </div>
    </div>
  )
}
