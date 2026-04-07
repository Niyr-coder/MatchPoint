import { authorizeOrRedirect } from "@/features/auth/queries"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

export default async function CoachClassesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  const supabase = await createClient()
  const coachId = ctx.profile.id
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

  const [studentsRes, earningsRes] = await Promise.all([
    supabase
      .from("coach_students")
      .select("id, sport, profiles!student_user_id(full_name)")
      .eq("coach_user_id", coachId)
      .eq("club_id", clubId)
      .eq("is_active", true)
      .limit(4),
    supabase
      .from("coach_earnings")
      .select("amount")
      .eq("coach_user_id", coachId)
      .eq("club_id", clubId)
      .gte("date", firstOfMonth),
  ])

  const students = studentsRes.data ?? []
  const studentCount = String(students.length)
  const totalEarnings = (earningsRes.data ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
  const earningsDisplay = `$${totalEarnings.toFixed(2)}`

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Estudiantes", value: studentCount },
    { label: "Ganancias mes", value: earningsDisplay },
    { label: "Este mes", value: String((earningsRes.data ?? []).length) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="coach" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's class schedule */}
        <BentoCard
          variant="default"
          icon="BookOpen"
          label="Mis estudiantes activos"
          title="Estudiantes asignados"
          subtitle={`Estudiantes activos en este club`}
          index={0}
        >
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e5e5e5]">
            {students.length === 0 ? (
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-3 text-center">
                Sin estudiantes asignados aún
              </p>
            ) : (
              students.map((s, i) => {
                const profile = (Array.isArray(s.profiles) ? s.profiles[0] : s.profiles) as { full_name: string | null } | null
                return (
                  <div key={i} className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-zinc-50">
                    <div className="flex items-center gap-2.5">
                      <span className="size-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-black text-amber-700">
                        {(profile?.full_name ?? "?")[0]?.toUpperCase()}
                      </span>
                      <p className="text-xs font-black text-[#0a0a0a]">{profile?.full_name ?? "—"}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      {s.sport}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </BentoCard>

        {/* Student count */}
        <BentoCard
          variant="default"
          icon="Users"
          label="Mis estudiantes"
          title="Miembros del club"
          subtitle="Estudiantes activos registrados"
          index={1}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{studentCount}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                miembros activos
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-black text-[#d97706] bg-amber-50 px-2 py-0.5 rounded-full">
                Entrenador
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Monthly earnings — real data from coach_earnings */}
        <BentoCard
          variant="default"
          icon="DollarSign"
          label="Ganancias del mes"
          title="Ingresos del mes"
          subtitle="Registrados por el club este mes"
          index={2}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-3xl font-black text-[#0a0a0a] leading-none">{earningsDisplay}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                {(earningsRes.data ?? []).length} registros este mes
              </p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              ↑ En curso
            </span>
          </div>
        </BentoCard>

        {/* Total students card */}
        <BentoCard
          variant="default"
          icon="Users"
          label="Total estudiantes"
          title="Mis estudiantes"
          subtitle="Estudiantes activos asignados"
          index={3}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-4xl font-black text-[#0a0a0a] leading-none">{studentCount}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                estudiantes activos
              </p>
            </div>
            <span className="text-xs font-black text-[#d97706] bg-amber-50 px-2 py-0.5 rounded-full">Entrenador</span>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
