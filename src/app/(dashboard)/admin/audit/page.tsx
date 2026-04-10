import { authorizeOrRedirect } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/PageHeader"
import { AdminAuditView } from "@/components/admin/AdminAuditView"
import type { AuditLogEntry, AuditMeta } from "@/app/api/admin/audit/route"

export const metadata = {
  title: "Auditoría | MATCHPOINT Admin",
}

const PAGE_LIMIT = 50

export default async function AdminAuditPage() {
  await authorizeOrRedirect({ requiredRoles: ["admin"] })

  const supabase = createServiceClient()

  // Parallel: count + first page of entries
  const [countRes, dataRes] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("audit_log")
      .select(
        "id, action, entity_type, entity_id, actor_id, details, created_at, profiles!audit_log_actor_id_fkey(full_name, first_name, last_name, username)"
      )
      .order("created_at", { ascending: false })
      .range(0, PAGE_LIMIT - 1),
  ])

  const initialEntries: AuditLogEntry[] = (dataRes.data ?? []).map((row) => {
    const profile = row.profiles as {
      full_name?: string | null
      first_name?: string | null
      last_name?: string | null
      username?: string | null
    } | null

    const actorName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      profile?.username ||
      null

    return {
      id: row.id as string,
      action: row.action as string,
      entity_type: (row.entity_type as string | null) ?? null,
      entity_id: (row.entity_id as string | null) ?? null,
      actor_id: (row.actor_id as string | null) ?? null,
      actor_name: actorName,
      details: ((row.details as Record<string, unknown>) ?? {}),
      created_at: row.created_at as string,
    }
  })

  const initialMeta: AuditMeta = {
    total: countRes.count ?? 0,
    page: 1,
    limit: PAGE_LIMIT,
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Gestión Global"
        title="Auditoría"
        action={
          <span className="text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full border bg-zinc-100 text-zinc-500 border-zinc-200">
            {initialMeta.total} registros
          </span>
        }
      />
      <AdminAuditView initialEntries={initialEntries} initialMeta={initialMeta} />
    </div>
  )
}
