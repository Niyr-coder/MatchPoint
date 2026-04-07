import { authorizeOrRedirect } from "@/features/auth/queries"
import { getCoachStudents } from "@/features/clubs/queries/coach"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { CoachClassInvitePanel } from "@/features/memberships/components/CoachClassInvitePanel"
import { Users } from "lucide-react"
import type { StudentEntry } from "@/features/clubs/queries/coach"

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

const SPORT_BADGE_VARIANT: Record<string, "success" | "info" | "warning" | "accent"> = {
  futbol: "success",
  padel: "accent",
  tenis: "info",
  pickleball: "warning",
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getTopSport(students: StudentEntry[]): string | null {
  if (students.length === 0) return null
  const counts = students.reduce<Record<string, number>>((acc, s) => {
    return { ...acc, [s.sport]: (acc[s.sport] ?? 0) + 1 }
  }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? (SPORT_LABELS[top[0]] ?? top[0]) : null
}

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const ctx = await authorizeOrRedirect({ clubId, requiredRoles: ["coach"] })

  const students = await getCoachStudents(ctx.userId, clubId)

  const activeStudents = students.filter((s) => s.isActive).length
  const topSport = getTopSport(students)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Mis Estudiantes" title="Estudiantes" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total" value={students.length} icon={Users} variant="default" />
        <StatCard label="Activos" value={activeStudents} icon={Users} variant="success" />
        <StatCard
          label="Deporte Principal"
          value={topSport ?? "—"}
          icon={Users}
          variant="accent"
        />
      </div>

      {/* Invite panel */}
      <CoachClassInvitePanel coachUserId={ctx.userId} clubId={clubId} />

      {/* Students grid */}
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no tienes estudiantes asignados"
          description="Aún no tienes estudiantes asignados a este club."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-4 flex items-center gap-3 hover:border-zinc-300 transition-colors"
            >
              <div className="size-12 rounded-full bg-zinc-100 text-zinc-500 font-black text-sm flex items-center justify-center shrink-0">
                {getInitials(student.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#0a0a0a] truncate">
                  {student.fullName ?? "Sin nombre"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Desde {formatDate(student.startedAt)}
                </p>
                <div className="mt-1.5">
                  <StatusBadge
                    label={SPORT_LABELS[student.sport] ?? student.sport}
                    variant={SPORT_BADGE_VARIANT[student.sport] ?? "neutral"}
                  />
                </div>
              </div>
              {!student.isActive && (
                <StatusBadge label="Inactivo" variant="neutral" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
