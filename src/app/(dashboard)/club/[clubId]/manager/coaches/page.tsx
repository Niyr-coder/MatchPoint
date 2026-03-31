import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { UserCheck, Users } from "lucide-react"

interface CoachRow {
  id: string
  userId: string
  fullName: string | null
  sport: string | null
  isActive: boolean
  joinedAt: string
  studentCount: number
}

type RawMember = {
  id: string
  user_id: string
  is_active: boolean
  joined_at: string
  sport: string | null
  profiles: Array<{ full_name: string | null }> | { full_name: string | null } | null
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

export default async function ManagerCoachesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["manager", "owner"] })

  const supabase = await createServiceClient()

  const [membersResult, studentsResult] = await Promise.all([
    supabase
      .from("club_members")
      .select(`
        id,
        user_id,
        is_active,
        joined_at,
        sport,
        profiles!club_members_user_profile_fk ( full_name )
      `)
      .eq("club_id", clubId)
      .eq("role", "coach")
      .order("joined_at", { ascending: false }),
    supabase
      .from("coach_students")
      .select("coach_id")
      .eq("club_id", clubId),
  ])

  const studentCountMap = new Map<string, number>()
  for (const row of (studentsResult.data ?? [])) {
    const key = (row as { coach_id: string }).coach_id
    studentCountMap.set(key, (studentCountMap.get(key) ?? 0) + 1)
  }

  const coaches: CoachRow[] = (membersResult.data as unknown as RawMember[] ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      id: m.id,
      userId: m.user_id,
      fullName: (profile as { full_name: string | null } | null)?.full_name ?? null,
      sport: m.sport,
      isActive: m.is_active,
      joinedAt: m.joined_at,
      studentCount: studentCountMap.get(m.user_id) ?? 0,
    }
  })

  const total = coaches.length
  const active = coaches.filter((c) => c.isActive).length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="MANAGER · ENTRENADORES"
        title="Entrenadores"
        description="Supervisión de los entrenadores del club"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Entrenadores" value={total} icon={UserCheck} variant="default" />
        <StatCard label="Activos" value={active} icon={UserCheck} variant="success" />
      </div>

      {coaches.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Sin entrenadores registrados"
          description="Aún no hay entrenadores asignados a este club."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black text-[#0a0a0a]">
                  {coach.fullName ?? "Sin nombre"}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {coach.sport ? (SPORT_LABELS[coach.sport] ?? coach.sport) : "Sin especialidad"}
                  {" · "}Desde{" "}
                  {new Date(coach.joinedAt).toLocaleDateString("es-EC", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <Users className="size-3" />
                  {coach.studentCount} alumnos
                </span>
                <StatusBadge
                  label={coach.isActive ? "Activo" : "Inactivo"}
                  variant={coach.isActive ? "success" : "neutral"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
