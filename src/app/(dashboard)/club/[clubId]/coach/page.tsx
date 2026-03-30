import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { RoleWelcomeBanner } from "@/components/dashboard/RoleWelcomeBanner"
import { BentoCard } from "@/components/dashboard/BentoCard"
import { createClient } from "@/lib/supabase/server"

const PLACEHOLDER_CLASSES = [
  { time: "08:00", sport: "Pádel", students: 4, court: "Cancha 1" },
  { time: "10:00", sport: "Tenis", students: 2, court: "Cancha 3" },
  { time: "14:00", sport: "Pádel", students: 4, court: "Cancha 2" },
]

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
  const today = now.toISOString().split("T")[0]
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

  const [studentsRes, earningsRes] = await Promise.all([
    supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("coach_id", coachId)
      .gte("start_time", `${firstOfMonth}T00:00:00`)
      .neq("status", "cancelled"),
  ])

  const studentCount = studentsRes.error ? "—" : String(studentsRes.count ?? 0)
  const classesThisMonth = earningsRes.error ? 0 : (earningsRes.count ?? 0)

  // Determine next class from placeholder schedule
  const nowHour = now.getHours() * 60 + now.getMinutes()
  const nextClass = PLACEHOLDER_CLASSES.find((c) => {
    const [h, m] = c.time.split(":").map(Number)
    return h * 60 + m > nowHour
  }) ?? null

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const stats = [
    { label: "Clases hoy", value: String(PLACEHOLDER_CLASSES.length) },
    { label: "Estudiantes", value: studentCount },
    { label: "Clases mes", value: String(classesThisMonth) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <RoleWelcomeBanner profile={ctx.profile} role="coach" date={date} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's class schedule */}
        <BentoCard
          variant="default"
          icon="BookOpen"
          label="Clases de hoy"
          title="Mi horario"
          subtitle={`Clases programadas · ${date}`}
          index={0}
        >
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e5e5e5]">
            {PLACEHOLDER_CLASSES.map((cls, i) => {
              const [h, m] = cls.time.split(":").map(Number)
              const isPast = h * 60 + m < nowHour
              const isNext = nextClass?.time === cls.time
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-2.5 rounded-xl"
                  style={{
                    backgroundColor: isNext ? "#d97706/10" : isPast ? "transparent" : "#f4f4f5",
                    border: isNext ? "1px solid #d9770620" : "1px solid transparent",
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-[10px] font-black text-white rounded-lg px-1.5 py-0.5"
                      style={{ backgroundColor: isNext ? "#d97706" : "#a1a1aa" }}
                    >
                      {cls.time}
                    </span>
                    <div>
                      <p className="text-xs font-black text-[#0a0a0a] uppercase tracking-wide">{cls.sport}</p>
                      <p className="text-[10px] text-zinc-500">{cls.court}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">{cls.students}</span>
                    <span className="text-[10px] text-zinc-400">👤</span>
                  </div>
                </div>
              )
            })}
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
                Coach
              </span>
            </div>
          </div>
        </BentoCard>

        {/* Monthly earnings placeholder */}
        <BentoCard
          variant="default"
          icon="DollarSign"
          label="Ganancias del mes"
          title="Ingresos estimados"
          subtitle="Basado en clases este mes"
          index={2}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            <div>
              <p className="text-3xl font-black text-[#0a0a0a] leading-none">$0.00</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                {classesThisMonth} clases este mes
              </p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              ↑ En curso
            </span>
          </div>
        </BentoCard>

        {/* Next class countdown */}
        <BentoCard
          variant="default"
          icon="Calendar"
          label="Próxima clase"
          title={nextClass ? `${nextClass.time} · ${nextClass.sport}` : "Sin más clases"}
          subtitle={nextClass ? `${nextClass.court} · ${nextClass.students} estudiantes` : "Has completado todas las clases del día"}
          index={3}
        >
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#e5e5e5]">
            {nextClass ? (
              <>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Empieza a las
                  </p>
                  <p className="text-2xl font-black text-[#d97706]">{nextClass.time}</p>
                </div>
                <span className="size-2 rounded-full bg-[#d97706] animate-pulse" />
              </>
            ) : (
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                ¡Buen trabajo hoy!
              </p>
            )}
          </div>
        </BentoCard>
      </div>
    </div>
  )
}
