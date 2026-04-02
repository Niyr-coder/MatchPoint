import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Users } from "lucide-react"

interface MemberRow {
  id: string
  userId: string
  fullName: string | null
  username: string | null
  role: string
  joinedAt: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
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

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    user: "Miembro",
    partner: "Socio",
    coach: "Entrenador",
    employee: "Empleado",
    manager: "Gerente",
    owner: "Propietario",
  }
  return labels[role] ?? role
}

async function getActiveMembers(clubId: string): Promise<MemberRow[]> {
  try {
    const service = await createServiceClient()

    const { data, error } = await service
      .from("club_members")
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles!club_members_user_profile_fk (
          full_name,
          username
        )
      `)
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("joined_at", { ascending: false })

    if (error || !data) return []

    type RawRow = {
      id: string
      user_id: string
      role: string
      joined_at: string
      profiles: Array<{ full_name: string | null; username: string | null }>
    }

    return (data as unknown as RawRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        id: row.id,
        userId: row.user_id,
        fullName: (profile as { full_name: string | null } | null)?.full_name ?? null,
        username: (profile as { username: string | null } | null)?.username ?? null,
        role: row.role,
        joinedAt: row.joined_at,
      }
    })
  } catch {
    return []
  }
}

export default async function EmployeeClientsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["employee"] })

  const members = await getActiveMembers(clubId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Empleado · Clientes"
        title="Miembros del Club"
        description="Miembros activos registrados en el club"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Miembros Activos"
          value={members.length}
          icon={Users}
          variant="default"
        />
        <StatCard
          label="Registrados Recientemente"
          value={members.filter((m) => {
            const joined = new Date(m.joinedAt)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return joined >= thirtyDaysAgo
          }).length}
          icon={Users}
          variant="success"
          description="Últimos 30 días"
        />
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay miembros activos"
          description="Los miembros activos del club aparecerán aquí."
        />
      ) : (
        <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 border-b border-[#e5e5e5] px-5 py-3 bg-zinc-50/60">
            {["Miembro", "Usuario", "Rol", "Ingresó"].map((h) => (
              <div
                key={h}
                className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#f0f0f0]">
            {members.map((member, i) => (
              <div
                key={member.id}
                className="animate-fade-in grid grid-cols-4 px-5 py-3.5 items-center"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-zinc-100 text-zinc-500 font-black text-xs flex items-center justify-center shrink-0">
                    {getInitials(member.fullName)}
                  </div>
                  <span className="text-sm font-medium text-[#0a0a0a] truncate">
                    {member.fullName ?? "Sin nombre"}
                  </span>
                </div>

                {/* Username */}
                <span className="text-sm text-zinc-400">
                  {member.username ? `@${member.username}` : "—"}
                </span>

                {/* Role badge */}
                <div>
                  <StatusBadge
                    label={roleLabel(member.role)}
                    variant="neutral"
                  />
                </div>

                {/* Joined date */}
                <span className="text-sm text-zinc-400">
                  {formatDate(member.joinedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
