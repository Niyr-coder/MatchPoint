import { StatCard } from "@/components/dashboard/StatCard"
import { BentoCard } from "@/components/dashboard/BentoCard"

export default function PartnerDashboardPage() {
  return (
    <div className="space-y-3">
      <div className="pb-6 mb-2 border-b border-[#e5e5e5]">
        <p className="label-green mb-1">Socio del Club</p>
        <h1
          className="font-black text-[#0a0a0a] uppercase leading-[0.88] tracking-[-0.03em]"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          Mi Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense">

        {/* Comisión — wide accent */}
        <BentoCard
          variant="accent"
          icon="DollarSign"
          label="01"
          title="Mi Comisión"
          subtitle="Ingresos del mes actual"
          className="col-span-2 lg:col-span-2"
          index={0}
        >
          <div className="flex items-end justify-between mt-auto pt-2">
            <p
              className="font-black text-[#0a0a0a] leading-none tracking-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
            >
              —
              <span className="text-base font-bold text-zinc-400 ml-1.5">USD</span>
            </p>
          </div>
        </BentoCard>

        {/* Torneos */}
        <StatCard label="Torneos Organizados" value="—" icon="Trophy" index={1} />

        {/* Equipo */}
        <StatCard label="Contactos del Equipo" value="—" icon="Users" index={2} />

        {/* Info card */}
        <BentoCard
          variant="dark"
          label="02"
          title="Actividad del Mes"
          subtitle="Resumen de tu participación en el club"
          className="col-span-2 lg:col-span-4"
          index={3}
        >
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              Próximamente
            </p>
          </div>
        </BentoCard>

      </div>
    </div>
  )
}
