import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { DashboardHeading } from "@/components/dashboard/DashboardHeading"

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-3">
      <DashboardHeading label="Dueño del Club" title="Dashboard del Club" />

      {/* Bento grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense">

        {/* Ocupación — tall accent card (col 1, rows 1-2) */}
        <BentoCard
          variant="accent"
          icon="BarChart3"
          label="01"
          title="Ocupación Hoy"
          className="row-span-2 lg:col-span-1"
          index={0}
        >
          <div className="flex flex-col justify-between flex-1 pt-2">
            <p
              className="font-black text-[#0a0a0a] leading-none tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
            >
              —
              <span className="text-base font-bold text-zinc-400 ml-1">%</span>
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-auto">
              Canchas activas
            </p>
          </div>
        </BentoCard>

        {/* Ingresos */}
        <StatCard label="Ingresos del Día" value="—" suffix="USD" icon="DollarSign" index={1} />

        {/* Usuarios */}
        <StatCard label="Usuarios Activos" value="—" icon="Users" index={2} />

        {/* Reservas */}
        <StatCard label="Reservas Hoy" value="—" icon="Calendar" index={3} />

        {/* Wide rendimiento card (cols 2-4, row 2) */}
        <BentoCard
          variant="dark"
          label="02"
          title="Rendimiento Semanal"
          subtitle="Evolución de reservas e ingresos"
          className="col-span-2 lg:col-span-3"
          index={4}
        >
          <div className="flex items-end justify-between mt-auto pt-4">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
            <div className="flex items-end gap-1.5">
              {[4, 6, 3, 8, 5, 7, 9].map((h, i) => (
                <div
                  key={i}
                  className="w-2 rounded-sm bg-[#16a34a]/30"
                  style={{ height: `${h * 5}px` }}
                />
              ))}
            </div>
          </div>
        </BentoCard>

      </div>
    </div>
  )
}
