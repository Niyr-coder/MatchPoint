import { authorizeOrRedirect } from "@/lib/auth/authorization"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CreditCard, Users, UserCheck } from "lucide-react"

interface MemberRow {
  id: string
  fullName: string | null
  role: string
  joinedAt: string
  isActive: boolean
}

type RawMember = {
  id: string
  role: string
  is_active: boolean
  joined_at: string
  profiles: Array<{ full_name: string | null }> | { full_name: string | null } | null
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  manager: "Manager",
  coach: "Entrenador",
  employee: "Empleado",
  partner: "Socio",
  user: "Usuario",
}

type RoleVariant = "accent" | "info" | "success" | "warning" | "neutral"

const ROLE_VARIANT: Record<string, RoleVariant> = {
  owner: "accent",
  manager: "info",
  coach: "success",
  employee: "warning",
  partner: "neutral",
  user: "neutral",
}

export default async function OwnerMembershipsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  await authorizeOrRedirect({ clubId, requiredRoles: ["owner"] })

  const supabase = await createServiceClient()

  const { data: rawMembers } = await supabase
    .from("club_members")
    .select(`
      id,
      role,
      is_active,
      joined_at,
      profiles!club_members_user_profile_fk ( full_name )
    `)
    .eq("club_id", clubId)
    .order("joined_at", { ascending: false })

  const members: MemberRow[] = (rawMembers as unknown as RawMember[] ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      id: m.id,
      fullName: (profile as { full_name: string | null } | null)?.full_name ?? null,
      role: m.role,
      joinedAt: m.joined_at,
      isActive: m.is_active,
    }
  })

  const total = members.length
  const active = members.filter((m) => m.isActive).length
  const coaches = members.filter((m) => m.role === "coach").length
  const employees = members.filter((m) => m.role === "employee").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="OWNER · MEMBRESÍAS"
        title="Gestión de Membresías"
        description="Planes, precios y miembros activos del club"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Miembros" value={total} icon={Users} variant="default" />
        <StatCard label="Activos" value={active} icon={UserCheck} variant="success" />
        <StatCard label="Entrenadores" value={coaches} icon={UserCheck} variant="accent" />
        <StatCard label="Empleados" value={employees} icon={CreditCard} variant="warning" />
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin miembros registrados"
          description="Aún no hay miembros en este club."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-black text-[#0a0a0a]">
                  {m.fullName ?? "Sin nombre"}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Desde{" "}
                  {new Date(m.joinedAt).toLocaleDateString("es-EC", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  label={ROLE_LABELS[m.role] ?? m.role}
                  variant={ROLE_VARIANT[m.role] ?? "neutral"}
                />
                <StatusBadge
                  label={m.isActive ? "Activo" : "Inactivo"}
                  variant={m.isActive ? "success" : "neutral"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
