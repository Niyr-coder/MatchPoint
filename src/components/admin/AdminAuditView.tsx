"use client"

import { useState, useTransition, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import type { AuditLogEntry, AuditMeta } from "@/app/api/admin/audit/route"

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "Todas las entidades" },
  { value: "users", label: "Usuarios" },
  { value: "clubs", label: "Clubs" },
  { value: "tournaments", label: "Torneos" },
  { value: "events", label: "Eventos" },
  { value: "reservations", label: "Reservas" },
]

// ── Action badge ──────────────────────────────────────────────────────────────

function actionColorClass(action: string): string {
  if (action.startsWith("bulk.delete") || action.includes("deleted")) {
    return "bg-red-50 text-red-700 border-red-100"
  }
  if (action.includes("suspend") || action.includes("deactivate")) {
    return "bg-amber-50 text-amber-700 border-amber-100"
  }
  if (
    action.includes("unsuspend") ||
    action.includes("activate") ||
    action.includes("verified")
  ) {
    return "bg-green-50 text-green-700 border-green-100"
  }
  if (action.includes("created") || action.includes("bulk.")) {
    return "bg-white text-[#0a0a0a] border-[#e5e5e5]"
  }
  if (action.includes("updated") || action.includes("role_changed")) {
    return "bg-purple-50 text-purple-700 border-purple-100"
  }
  return "bg-zinc-50 text-zinc-600 border-zinc-200"
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full border whitespace-nowrap ${actionColorClass(action)}`}
    >
      {action}
    </span>
  )
}

// ── Details expandable ────────────────────────────────────────────────────────

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)
  const isEmpty = Object.keys(details).length === 0

  if (isEmpty) {
    return <span className="text-zinc-400 text-[11px]">—</span>
  }

  const preview = JSON.stringify(details).slice(0, 60)
  const isLong = JSON.stringify(details).length > 60

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setExpanded((prev) => !prev)
        }}
        className="flex items-center gap-1 text-left text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors"
        aria-expanded={expanded}
      >
        <span className="font-mono truncate max-w-[200px]">
          {isLong && !expanded ? `${preview}…` : preview}
        </span>
        {isLong && (
          expanded
            ? <ChevronUp className="size-3 shrink-0" />
            : <ChevronDown className="size-3 shrink-0" />
        )}
      </button>
      {expanded && (
        <pre className="text-[10px] font-mono bg-zinc-50 border border-zinc-200 rounded-lg p-2 overflow-x-auto max-w-xs text-zinc-700 whitespace-pre-wrap break-all">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ── Date range input ──────────────────────────────────────────────────────────

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
      />
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <span className="text-[11px] text-zinc-400">
        {total === 0 ? "Sin resultados" : `${from}–${to} de ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="size-8 flex items-center justify-center rounded-full border border-[#e5e5e5] text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[11px] font-semibold text-zinc-600 min-w-[4rem] text-center">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="size-8 flex items-center justify-center rounded-full border border-[#e5e5e5] text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AuditFilters {
  action: string
  actor: string
  entity_type: string
  from_date: string
  to_date: string
}

const EMPTY_FILTERS: AuditFilters = {
  action: "",
  actor: "",
  entity_type: "",
  from_date: "",
  to_date: "",
}

const LIMIT = 50

interface AdminAuditViewProps {
  initialEntries: AuditLogEntry[]
  initialMeta: AuditMeta
}

export function AdminAuditView({ initialEntries, initialMeta }: AdminAuditViewProps) {
  const [, startTransition] = useTransition()

  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialEntries)
  const [total, setTotal] = useState(initialMeta.total)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track whether any filter has been touched to avoid redundant initial fetch
  const [filtersTouched, setFiltersTouched] = useState(false)

  const fetchAuditLog = useCallback(
    async (currentFilters: AuditFilters, currentPage: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set("page", String(currentPage))
        params.set("limit", String(LIMIT))
        if (currentFilters.action) params.set("action", currentFilters.action)
        if (currentFilters.actor) params.set("actor_id", currentFilters.actor)
        if (currentFilters.entity_type) params.set("entity_type", currentFilters.entity_type)
        if (currentFilters.from_date) params.set("from_date", currentFilters.from_date)
        if (currentFilters.to_date) params.set("to_date", currentFilters.to_date)

        const res = await fetch(`/api/admin/audit?${params.toString()}`)
        const json = (await res.json()) as {
          success: boolean
          data: AuditLogEntry[] | null
          meta?: { total: number; page: number; limit: number }
          error: string | null
        }
        if (!json.success) {
          setError(json.error ?? "Error al cargar el audit log")
          return
        }
        setEntries(json.data ?? [])
        setTotal(json.meta?.total ?? 0)
      } catch {
        setError("Error de conexión. Intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!filtersTouched) return
    void fetchAuditLog(filters, page)
  }, [fetchAuditLog, filters, page, filtersTouched])

  function handleFilterChange(key: keyof AuditFilters, value: string) {
    setFiltersTouched(true)
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function handleClearFilters() {
    setFiltersTouched(true)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  function handlePageChange(newPage: number) {
    setFiltersTouched(true)
    startTransition(() => setPage(newPage))
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5 flex flex-col gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Filtros
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action text filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
              Acción
            </label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              placeholder="Ej. user.suspended"
              className="border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            />
          </div>

          {/* Entity type */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
              Tipo de entidad
            </label>
            <select
              value={filters.entity_type}
              onChange={(e) => handleFilterChange("entity_type", e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white appearance-none cursor-pointer"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actor search — by name placeholder, API expects actor_id */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
              ID del actor (UUID)
            </label>
            <input
              type="text"
              value={filters.actor}
              onChange={(e) => handleFilterChange("actor", e.target.value)}
              placeholder="UUID del administrador"
              className="border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white font-mono"
            />
          </div>

          <DateInput
            label="Desde"
            value={filters.from_date}
            onChange={(v) => handleFilterChange("from_date", v)}
          />
          <DateInput
            label="Hasta"
            value={filters.to_date}
            onChange={(v) => handleFilterChange("to_date", v)}
          />

          {/* Clear filters */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-black uppercase tracking-wide px-4 py-2 rounded-full border border-[#e5e5e5] text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
        {/* Header */}
        <div className="grid border-b border-[#e5e5e5] px-5 py-3 bg-zinc-50/60"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1.5fr" }}
        >
          {["Acción", "Entidad", "Actor", "Detalles", "Fecha"].map((col) => (
            <div
              key={col}
              className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="divide-y divide-[#f0f0f0]">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="grid px-5 py-3.5 items-center gap-3"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1.5fr" }}
              >
                {Array.from({ length: 5 }).map((__, j) => (
                  <div
                    key={j}
                    className="h-4 rounded-lg bg-zinc-100 animate-pulse"
                    style={{ animationDelay: `${(i * 5 + j) * 0.02}s` }}
                  />
                ))}
              </div>
            ))
          ) : error ? (
            <div className="flex items-center justify-center py-14">
              <p className="text-sm font-bold text-red-500">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-14">
              <p className="text-sm font-bold text-zinc-400">Sin entradas en el audit log</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="grid px-5 py-3.5 items-start gap-2"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 2fr 1.5fr" }}
              >
                {/* Action */}
                <ActionBadge action={entry.action} />

                {/* Entity */}
                <div className="flex flex-col gap-0.5">
                  {entry.entity_type && (
                    <span className="text-[11px] font-semibold text-zinc-700">
                      {entry.entity_type}
                    </span>
                  )}
                  {entry.entity_id && (
                    <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[100px]">
                      {entry.entity_id}
                    </span>
                  )}
                  {!entry.entity_type && !entry.entity_id && (
                    <span className="text-zinc-400 text-[11px]">—</span>
                  )}
                </div>

                {/* Actor */}
                <div className="flex flex-col gap-0.5">
                  {entry.actor_name ? (
                    <span className="text-[11px] font-semibold text-zinc-700 truncate">
                      {entry.actor_name}
                    </span>
                  ) : null}
                  {entry.actor_id ? (
                    <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[100px]">
                      {entry.actor_id}
                    </span>
                  ) : (
                    <span className="text-zinc-400 text-[11px]">—</span>
                  )}
                </div>

                {/* Details */}
                <DetailsCell details={entry.details} />

                {/* Date */}
                <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
