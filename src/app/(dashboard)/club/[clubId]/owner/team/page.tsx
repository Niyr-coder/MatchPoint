import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getClubTeam } from "@/lib/team/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { TeamManager } from "@/components/team/TeamManager"
import { Users } from "lucide-react"

export default async function TeamPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const members = await getClubTeam(clubId)

  const managers = members.filter((m) => m.role === "manager").length
  const employees = members.filter((m) => m.role === "employee").length
  const coaches = members.filter((m) => m.role === "coach").length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader label="Equipo" title="Mi Equipo" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Miembros"
          value={members.length}
          icon={Users}
          variant="default"
        />
        <StatCard
          label="Managers"
          value={managers}
          icon={Users}
          variant="accent"
        />
        <StatCard
          label="Empleados"
          value={employees}
          icon={Users}
          variant="default"
        />
        <StatCard
          label="Coaches"
          value={coaches}
          icon={Users}
          variant="warning"
        />
      </div>

      {/* Interactive team manager */}
      <TeamManager clubId={clubId} initialMembers={members} />
    </div>
  )
}
