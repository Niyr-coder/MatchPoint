import { authorizeOrRedirect } from "@/features/auth/queries"
import { getAdminModerationData, getClubRequestsAdmin } from "@/lib/admin/queries"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminPendingClubsPanel } from "@/components/admin/AdminPendingClubsPanel"
import { AdminClubRequestsView } from "@/components/admin/AdminClubRequestsView"
import { Users, Building2, ExternalLink, FileText } from "lucide-react"
import Link from "next/link"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  partner: "Partner",
  manager: "Manager",
  employee: "Empleado",
  coach: "Coach",
  user: "Usuario",
}

const ROLE_CLASSES: Record<string, string> = {
  admin: "bg-red-50 text-red-700",
  owner: "bg-violet-50 text-violet-700",
  partner: "bg-success text-primary",
  manager: "bg-indigo-50 text-indigo-700",
  employee: "bg-muted text-zinc-600",
  coach: "bg-amber-50 text-amber-700",
  user: "bg-muted text-zinc-500",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="size-8 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="size-4 text-zinc-500" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
        {title}
      </p>
      {count !== undefined && (
        <span className="ml-auto text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-zinc-500">
          {count}
        </span>
      )}
    </div>
  )
}

export default async function AdminModerationPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const [data, clubRequests] = await Promise.all([
    getAdminModerationData(),
    getClubRequestsAdmin(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="ADMIN · MODERACIÓN"
        title="Moderación de Contenido"
        description="Revisión de usuarios recientes y clubs pendientes de activación"
      />

      {/* Section 1: Recent users */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <SectionHeader icon={Users} title="Usuarios registrados recientemente" count={data.recentUsers.length} />

        {data.recentUsers.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">Sin usuarios recientes</p>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 pb-2 border-b border-border mb-1">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Nombre</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Rol</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Ciudad</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 text-right">Registro</p>
            </div>
            <div className="flex flex-col divide-y divide-border-subtle">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 py-3 items-center">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {u.full_name ?? <span className="text-zinc-400 italic">Sin nombre</span>}
                    </p>
                    {u.username && (
                      <p className="text-[10px] text-zinc-400">@{u.username}</p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full w-fit ${ROLE_CLASSES[u.global_role] ?? "bg-muted text-zinc-500"}`}
                  >
                    {ROLE_LABELS[u.global_role] ?? u.global_role}
                  </span>
                  <p className="text-xs text-zinc-500">{u.city ?? "—"}</p>
                  <p className="text-xs text-zinc-400 text-right">{formatDate(u.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Section 2: Inactive / pending clubs */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <Building2 className="size-4 text-amber-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Clubs inactivos / pendientes
          </p>
          <span className="ml-auto text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
            {data.pendingClubs.length}
          </span>
          <Link
            href="/admin/clubs"
            className="text-[10px] font-black uppercase tracking-wide text-foreground hover:underline flex items-center gap-1 ml-2 hover:opacity-80"
          >
            Gestionar <ExternalLink className="size-3" />
          </Link>
        </div>

        <AdminPendingClubsPanel clubs={data.pendingClubs} />
      </div>

      {/* Section 3: Club requests */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="size-8 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="size-4 text-zinc-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Solicitudes de creación de club
          </p>
          <span className="ml-auto text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
            {clubRequests.filter((r) => r.status === "pending").length} pendientes
          </span>
        </div>

        <AdminClubRequestsView requests={clubRequests} />
      </div>

      {/* Section 4: Summary */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Resumen de moderación
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-2xl font-black text-foreground">{data.recentUsers.length}</p>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">
              Usuarios recientes
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-2xl font-black text-amber-700">{data.pendingClubs.length}</p>
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wide mt-0.5">
              Clubs inactivos
            </p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-2xl font-black text-foreground">
              {clubRequests.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">
              Solicitudes pendientes
            </p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-2xl font-black text-foreground">
              {data.recentUsers.filter((u) => u.global_role === "admin").length}
            </p>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">
              Admins totales
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
