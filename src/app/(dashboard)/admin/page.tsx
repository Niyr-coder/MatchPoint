import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default function AdminDashboardPage() {
  return (
    <div className="space-y-3">

      {/* Page heading */}
      <div className="pb-6 mb-2 border-b border-[#e5e5e5]">
        <p className="label-green mb-1">Plataforma Global</p>
        <h1
          className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em]"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          Dashboard Global
        </h1>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Row 1: Stat cards */}
        <StatCard label="Clubs Activos" value="—" icon="Building2" accent index={0} />
        <StatCard label="Usuarios Totales" value="—" icon="Users" index={1} />
        <StatCard label="Ingresos del Mes" value="—" suffix="USD" icon="DollarSign" index={2} />
        <StatCard label="Torneos Activos" value="—" icon="Trophy" index={3} />

        {/* Row 2: Wide info cards */}
        <BentoCard
          variant="dark"
          label="02"
          title="Actividad Reciente"
          subtitle="Historial de acciones en la plataforma"
          className="col-span-2"
          index={4}
        >
          <div className="flex items-end justify-between mt-auto pt-4">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
            <div className="flex items-end gap-1">
              {[3, 5, 2, 7, 4, 6, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-white/20"
                  style={{ height: `${h * 4}px` }}
                />
              ))}
            </div>
          </div>
        </BentoCard>

        <BentoCard
          variant="default"
          label="03"
          title="Estado del Sistema"
          subtitle="Salud de servicios y APIs"
          className="col-span-2"
          index={5}
        >
          <div className="flex flex-col gap-2 mt-auto pt-4">
            {[
              { name: "Base de datos", ok: true },
              { name: "Autenticación", ok: true },
              { name: "Pagos", ok: true },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">{s.name}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">
                  Activo
                </span>
              </div>
            ))}
          </div>
        </BentoCard>

      </div>
    </div>
  )
}
