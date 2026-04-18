"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Link2, Plus, ChevronRight } from "lucide-react"
import { AdminCreateInviteModal } from "@/components/admin/AdminCreateInviteModal"
import { AdminDotsMenu } from "@/components/admin/shared/AdminDotsMenu"
import { AdminInlinePanel } from "@/components/admin/shared/AdminInlinePanel"
import { FilterBar } from "@/components/shared/FilterBar"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import type { Column } from "@/components/shared/DataTable"
import type { InviteLinkAdmin } from "@/app/api/admin/invites/route"

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = "https://matchpoint.top"

const ENTITY_TYPE_LABELS: Record<string, string> = {
  club: "Club",
  tournament: "Torneo",
  event: "Evento",
  team: "Equipo",
  platform: "Plataforma",
}

const ENTITY_TYPE_BADGE_CLASSES: Record<string, string> = {
  club: "bg-card text-foreground border-border",
  tournament: "bg-amber-50 text-amber-700 border-amber-200",
  event: "bg-purple-50 text-purple-700 border-purple-200",
  team: "bg-teal-50 text-teal-700 border-teal-200",
  platform: "bg-muted text-zinc-600 border-zinc-300",
}

const ENTITY_TYPE_OPTIONS = [
  { value: "club", label: "Club" },
  { value: "tournament", label: "Torneo" },
  { value: "event", label: "Evento" },
  { value: "team", label: "Equipo" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "revoked", label: "Revocado" },
  { value: "expired", label: "Expirado" },
  { value: "exhausted", label: "Agotado" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInviteStatus(invite: InviteLinkAdmin): {
  label: string
  variant: "success" | "error" | "warning" | "neutral"
} {
  if (!invite.is_active) {
    return { label: "Revocado", variant: "error" }
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { label: "Expirado", variant: "neutral" }
  }
  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return { label: "Agotado", variant: "warning" }
  }
  return { label: "Activo", variant: "success" }
}

function canRevoke(invite: InviteLinkAdmin): boolean {
  return invite.is_active
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Sin expiración"
  return new Date(expiresAt).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ── Main component ────────────────────────────────────────────────────────────

interface AdminInvitesViewProps {
  invites: InviteLinkAdmin[]
}

export function AdminInvitesView({ invites }: AdminInvitesViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<Record<string, string>>({
    search: "",
    entity_type: "",
    status: "",
  })

  const [pendingRevoke, setPendingRevoke] = useState<InviteLinkAdmin | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggleExpand(inviteId: string) {
    setExpandedId((prev) => (prev === inviteId ? null : inviteId))
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleCreated() {
    startTransition(() => router.refresh())
  }

  const filtered = invites.filter((invite) => {
    const search = filters.search.toLowerCase()
    const matchSearch =
      !search ||
      invite.code.toLowerCase().includes(search) ||
      (invite.creator_name ?? "").toLowerCase().includes(search) ||
      (invite.creator_email ?? "").toLowerCase().includes(search)

    const matchEntityType =
      !filters.entity_type || invite.entity_type === filters.entity_type

    const statusInfo = getInviteStatus(invite)
    const matchStatus =
      !filters.status ||
      (filters.status === "active" && statusInfo.label === "Activo") ||
      (filters.status === "revoked" && statusInfo.label === "Revocado") ||
      (filters.status === "expired" && statusInfo.label === "Expirado") ||
      (filters.status === "exhausted" && statusInfo.label === "Agotado")

    return matchSearch && matchEntityType && matchStatus
  })

  const handleRevoke = useCallback(async () => {
    if (!pendingRevoke) return
    setRevokeLoading(true)
    setRevokeError(null)
    try {
      const res = await fetch(`/api/admin/invites/${pendingRevoke.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      })
      const json: { success: boolean; error?: string | null } = await res.json()
      if (!json.success) {
        setRevokeError(json.error ?? "Error al revocar el invite")
        return
      }
      setPendingRevoke(null)
      startTransition(() => router.refresh())
    } catch {
      setRevokeError("Error de conexión. Intenta de nuevo.")
    } finally {
      setRevokeLoading(false)
    }
  }, [pendingRevoke, router, startTransition])

  const columns: Column<InviteLinkAdmin>[] = [
    {
      key: "expand",
      header: "",
      render: (invite) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(invite.id) }}
          className="flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
          aria-label={expandedId === invite.id ? "Colapsar" : "Expandir"}
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ${expandedId === invite.id ? "rotate-90" : ""}`} />
        </button>
      ),
      className: "w-6",
    },
    {
      key: "code",
      header: "Código",
      render: (invite) => (
        <span className="font-mono text-xs font-bold text-foreground bg-secondary px-2 py-0.5 rounded-lg tracking-wider">
          {invite.code}
        </span>
      ),
    },
    {
      key: "entity_type",
      header: "Tipo",
      render: (invite) => {
        const classes =
          ENTITY_TYPE_BADGE_CLASSES[invite.entity_type] ??
          "bg-secondary text-zinc-500 border-border"
        const label = ENTITY_TYPE_LABELS[invite.entity_type] ?? invite.entity_type
        return (
          <span
            className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${classes}`}
          >
            {label}
          </span>
        )
      },
    },
    {
      key: "entity_id",
      header: "Entidad",
      render: (invite) => (
        <span className="font-mono text-xs text-zinc-500">
          {invite.entity_id === "global"
            ? "global"
            : `${invite.entity_id.slice(0, 8)}…`}
        </span>
      ),
    },
    {
      key: "creator_name",
      header: "Creado por",
      render: (invite) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {invite.creator_name ?? "—"}
          </span>
          {invite.creator_email && (
            <span className="text-[11px] text-zinc-400">{invite.creator_email}</span>
          )}
        </div>
      ),
    },
    {
      key: "uses",
      header: "Usos",
      render: (invite) => (
        <span className="text-sm font-semibold">
          {invite.uses_count}
          <span className="text-zinc-400 font-normal">
            /{invite.max_uses !== null ? invite.max_uses : "∞"}
          </span>
        </span>
      ),
    },
    {
      key: "expires_at",
      header: "Expiración",
      render: (invite) => (
        <span className="text-sm text-zinc-500">{formatExpiry(invite.expires_at)}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (invite) => {
        const { label, variant } = getInviteStatus(invite)
        return <StatusBadge label={label} variant={variant} />
      },
    },
    {
      key: "dots",
      header: "",
      render: (invite) => (
        <AdminDotsMenu
          items={[
            {
              label: "Copiar enlace",
              onClick: async () => {
                const url = `${BASE_URL}/invite/${invite.code}`
                try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
              },
            },
            {
              label: "Revocar",
              variant: "danger",
              disabled: !canRevoke(invite),
              onClick: () => { setRevokeError(null); setPendingRevoke(invite) },
            },
          ]}
        />
      ),
      className: "flex justify-end",
    },
  ]

  function renderExpandedRow(invite: InviteLinkAdmin) {
    const { label, variant } = getInviteStatus(invite)
    const inviteUrl = `${BASE_URL}/invite/${invite.code}`

    const chips = [
      ENTITY_TYPE_LABELS[invite.entity_type] ?? invite.entity_type,
      `${invite.uses_count} usos${invite.max_uses !== null ? ` / ${invite.max_uses} máx` : ""}`,
      invite.expires_at ? `Expira: ${formatExpiry(invite.expires_at)}` : null,
    ].filter(Boolean) as string[]

    const avatar = (
      <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
        <Link2 className="size-5 text-teal-600" />
      </div>
    )

    return (
      <AdminInlinePanel
        avatar={avatar}
        name={invite.code}
        subtitle={invite.creator_name ?? "Sin creador"}
        chips={chips}
        badge={<StatusBadge label={label} variant={variant} />}
        actions={
          <>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(inviteUrl) } catch { /* ignore */ }
              }}
              className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-border text-zinc-600 hover:bg-secondary transition-colors"
            >
              Copiar enlace
            </button>
            {canRevoke(invite) && (
              <button
                onClick={() => { setRevokeError(null); setPendingRevoke(invite) }}
                className="text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Revocar
              </button>
            )}
          </>
        }
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <FilterBar
              searchPlaceholder="Buscar por código o creador..."
              filters={[
                {
                  key: "entity_type",
                  label: "Todos los tipos",
                  options: ENTITY_TYPE_OPTIONS,
                },
                {
                  key: "status",
                  label: "Todos los estados",
                  options: STATUS_OPTIONS,
                },
              ]}
              values={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 flex items-center gap-2 bg-foreground text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 transition-colors"
          >
            <Plus className="size-3.5" />
            Crear invitación
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No se encontraron invite links"
          keyExtractor={(invite) => invite.id}
          onRowClick={(invite) => toggleExpand(invite.id)}
          expandedRowId={expandedId}
          renderExpandedRow={renderExpandedRow}
          gridTemplateColumns="32px 0.6fr 0.4fr 0.6fr 0.8fr 0.4fr 0.6fr 0.5fr 40px"
        />

        {revokeError && !pendingRevoke && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {revokeError}
          </div>
        )}

        <ConfirmDialog
          open={pendingRevoke !== null}
          onOpenChange={(open) => {
            if (!open && !revokeLoading) setPendingRevoke(null)
          }}
          title="¿Revocar invite link?"
          description={
            pendingRevoke
              ? `El código "${pendingRevoke.code}" quedará inactivo. Los usuarios que ya lo usaron no se verán afectados, pero no podrá usarse nuevamente.`
              : ""
          }
          confirmLabel="Revocar"
          variant="danger"
          loading={revokeLoading}
          onConfirm={handleRevoke}
        />
      </div>

      <AdminCreateInviteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}
