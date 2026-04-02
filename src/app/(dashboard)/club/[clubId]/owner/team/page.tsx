import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { getClubTeam } from "@/lib/team/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { TeamManager } from "@/components/team/TeamManager"
import { InviteTogglePanel } from "@/components/invites/InviteTogglePanel"
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

      {/* Invite to club */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
            Invitaciones
          </p>
          <h3 className="text-sm font-black text-[#0a0a0a] mt-0.5">
            Invitar nuevos miembros al equipo
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Comparte este link para que managers, coaches o empleados se unan al club.
          </p>
        </div>
        <InviteTogglePanel entityType="club" entityId={clubId} label="Generar link de invitación al equipo" />
      </div>
    </div>
  )
}
