import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserCheck } from "lucide-react"

interface CoachRow {
  memberId: string
  userId: string
  fullName: string | null
  phone: string | null
  isActive: boolean
  activeStudents: number
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

async function getClubCoaches(clubId: string): Promise<CoachRow[]> {
  try {
    const service = await createServiceClient()

    const { data: members, error: membersError } = await service
      .from("club_members")
      .select(`
        id,
        user_id,
        is_active,
        profiles!club_members_user_profile_fk (
          full_name,
          phone
        )
      `)
      .eq("club_id", clubId)
      .eq("role", "coach")
      .order("joined_at", { ascending: false })

    if (membersError || !members) return []

    type RawMember = {
      id: string
      user_id: string
      is_active: boolean
      profiles: Array<{ full_name: string | null; phone: string | null }>
    }

    const coachUserIds = (members as unknown as RawMember[]).map((m) => m.user_id)

    const { data: studentsData } = await service
      .from("coach_students")
      .select("coach_user_id")
      .in("coach_user_id", coachUserIds)
      .eq("club_id", clubId)
      .eq("is_active", true)

    const studentCountMap = new Map<string, number>()
    for (const row of (studentsData ?? []) as Array<{ coach_user_id: string }>) {
      studentCountMap.set(row.coach_user_id, (studentCountMap.get(row.coach_user_id) ?? 0) + 1)
    }

    return (members as unknown as RawMember[]).map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return {
        memberId: m.id,
        userId: m.user_id,
        fullName: (profile as { full_name: string | null } | null)?.full_name ?? null,
        phone: (profile as { phone: string | null } | null)?.phone ?? null,
        isActive: m.is_active,
        activeStudents: studentCountMap.get(m.user_id) ?? 0,
      }
    })
  } catch {
    return []
  }
}

export default async function EmployeeCoachesPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const coaches = await getClubCoaches(clubId)
  const activeCoaches = coaches.filter((c) => c.isActive).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Empleado · Entrenadores" title="Entrenadores" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Total" value={coaches.length} icon={UserCheck} variant="default" />
        <StatCard label="Activos" value={activeCoaches} icon={UserCheck} variant="success" />
      </div>

      {coaches.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No hay entrenadores registrados"
          description="Cuando se incorporen entrenadores al club, aparecerán aquí."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((coach) => (
            <div
              key={coach.memberId}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-4 flex items-center gap-3 hover:border-zinc-300 transition-colors"
            >
              <div className="size-12 rounded-full bg-zinc-100 text-zinc-500 font-black text-sm flex items-center justify-center shrink-0">
                {getInitials(coach.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#0a0a0a] truncate">
                  {coach.fullName ?? "Sin nombre"}
                </p>
                {coach.phone && (
                  <p className="text-[11px] text-zinc-400 mt-0.5">{coach.phone}</p>
                )}
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {coach.activeStudents} estudiante{coach.activeStudents !== 1 ? "s" : ""} activo{coach.activeStudents !== 1 ? "s" : ""}
                </p>
              </div>
              {!coach.isActive && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 uppercase tracking-wide shrink-0">
                  Inactivo
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
