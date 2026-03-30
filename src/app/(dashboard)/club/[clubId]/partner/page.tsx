import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

const ROI_BARS = [
  { month: "Oct", value: 60 },
  { month: "Nov", value: 75 },
  { month: "Dic", value: 85 },
  { month: "Ene", value: 70 },
  { month: "Feb", value: 90 },
  { month: "Mar", value: 100 },
]

export default async function PartnerDashboardPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["partner"] })

  const supabase = await createClient()

  const [tournamentsRes, membersRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
  ])

  const tournamentCount = tournamentsRes.error ? "—" : String(tournamentsRes.count ?? 0)
  const teamCount = membersRes.error ? "—" : String(membersRes.count ?? 0)

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Comisión mes", value: "$0.00" },
    { label: "Torneos org.", value: tournamentCount },
    { label: "Equipo", value: teamCount },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="partner" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue share */}
        <BentoCard
          variant="default"
          icon="DollarSign"
          label="Mi financiero"
          title="Participación mensual"
          subtitle="Comisión sobre ingresos del club"
          index={0}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-3xl font-black text-[#0a0a0a] leading-none">$0.00</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                comisión del mes actual
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-black text-[#0d9488] bg-teal-50 px-2 py-0.5 rounded-full">
                Socio activo
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Tournament count */}
        <BentoCard
          variant="default"
          icon="Trophy"
          label="Torneos"
          title="Torneos organizados"
          subtitle="Torneos del club en la plataforma"
          index={1}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{tournamentCount}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                torneos registrados
              </p>
            </div>
            <div
              className="size-10 rounded-xl bg-[#0d9488]/10 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-lg">🏆</span>
            </div>
          </div>
        </BentoCard>

        {/* ROI placeholder chart */}
        <BentoCard
          variant="default"
          icon="BarChart3"
          label="ROI de inversión"
          title="Retorno histórico"
          subtitle="Últimos 6 meses (referencia)"
          index={2}
        >
          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-end justify-between gap-1.5 h-[60px]">
              {ROI_BARS.map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${bar.value * 0.55}px`,
                      backgroundColor: i === ROI_BARS.length - 1 ? "#0d9488" : "#0d9488",
                      opacity: i === ROI_BARS.length - 1 ? 1 : 0.3 + i * 0.12,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between gap-1.5">
              {ROI_BARS.map((bar, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">{bar.month}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
              Datos reales próximamente
            </p>
          </div>
        </BentoCard>

        {/* Team overview */}
        <BentoCard
          variant="default"
          icon="Users"
          label="Equipo del club"
          title="Vista general"
          subtitle="Miembros activos registrados"
          index={3}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{teamCount}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                miembros en el club
              </p>
            </div>
            <div className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-7 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center"
                >
                  <span className="text-[10px] text-zinc-500">👤</span>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
