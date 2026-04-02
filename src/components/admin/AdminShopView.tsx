"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import {
  ShoppingBag,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import type { AdminOrder, AdminProduct, AdminShopData, AdminShopStats } from "@/app/api/admin/shop/route"

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", className: "bg-blue-50 text-blue-700" },
  delivered: { label: "Entregado", className: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
}

// ── stats cards ────────────────────────────────────────────────────────────────

function StatsCards({ stats }: { stats: AdminShopStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            Ingresos totales
          </p>
        </div>
        <p className="text-2xl font-black text-[#0a0a0a]">{formatCurrency(stats.total_revenue)}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Órdenes no canceladas</p>
      </div>

      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            Órdenes pendientes
          </p>
        </div>
        <p className="text-2xl font-black text-[#0a0a0a]">{stats.pending_orders}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Requieren confirmación</p>
      </div>

      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <CheckCircle2 className="size-4 text-blue-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            Productos activos
          </p>
        </div>
        <p className="text-2xl font-black text-[#0a0a0a]">{stats.active_products}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Disponibles para compra</p>
      </div>
    </div>
  )
}

// ── orders table ───────────────────────────────────────────────────────────────

interface OrdersTableProps {
  orders: AdminOrder[]
  clubs: { id: string; name: string }[]
  loading: boolean
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onClubFilter: (clubId: string) => void
  onStatusFilter: (status: string) => void
  clubFilter: string
  statusFilter: string
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
]

function OrdersTable({
  orders,
  clubs,
  loading,
  page,
  total,
  limit,
  onPageChange,
  onClubFilter,
  onStatusFilter,
  clubFilter,
  statusFilter,
}: OrdersTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 border-b border-[#f0f0f0]">
        <div className="relative">
          <select
            value={clubFilter}
            onChange={(e) => onClubFilter(e.target.value)}
            className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm font-medium text-[#0a0a0a]
              focus:outline-none focus:border-[#0a0a0a] appearance-none pr-7"
          >
            <option value="">Todos los clubs</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="size-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilter(e.target.value)}
            className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm font-medium text-[#0a0a0a]
              focus:outline-none focus:border-[#0a0a0a] appearance-none pr-7"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="size-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f0]">
              {["Usuario", "Producto", "Cant.", "Total", "Estado", "Club", "Fecha"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f0f0f0]">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-zinc-100 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <ShoppingBag className="size-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-zinc-500">No hay órdenes con estos filtros.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const status = STATUS_LABELS[order.status] ?? { label: order.status, className: "bg-zinc-100 text-zinc-600" }
                return (
                  <tr key={order.id} className="border-b border-[#f0f0f0] hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-[#0a0a0a]">{order.user_name}</p>
                      <p className="text-[10px] text-zinc-400">{order.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#0a0a0a]">{order.product_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-[#0a0a0a]">{order.quantity}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-black text-[#0a0a0a]">{formatCurrency(order.total)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-500">{order.club_name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-500">{formatDate(order.created_at)}</p>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#f0f0f0]">
          <p className="text-xs text-zinc-500 font-medium">
            {total} órdenes · Página {page} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="size-8 rounded-lg border border-[#e5e5e5] flex items-center justify-center
                disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              <ChevronLeft className="size-4 text-zinc-500" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="size-8 rounded-lg border border-[#e5e5e5] flex items-center justify-center
                disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              <ChevronRight className="size-4 text-zinc-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── products table ─────────────────────────────────────────────────────────────

interface ProductsTableProps {
  products: AdminProduct[]
  clubs: { id: string; name: string }[]
  loading: boolean
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onClubFilter: (clubId: string) => void
  clubFilter: string
}

function ProductsTable({
  products,
  clubs,
  loading,
  page,
  total,
  limit,
  onPageChange,
  onClubFilter,
  clubFilter,
}: ProductsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] overflow-hidden">
      {/* Filter */}
      <div className="flex gap-3 p-4 border-b border-[#f0f0f0]">
        <div className="relative">
          <select
            value={clubFilter}
            onChange={(e) => onClubFilter(e.target.value)}
            className="rounded-xl border border-[#e5e5e5] px-3 py-2 text-sm font-medium text-[#0a0a0a]
              focus:outline-none focus:border-[#0a0a0a] appearance-none pr-7"
          >
            <option value="">Todos los clubs</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="size-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f0]">
              {["Nombre", "Club", "Precio", "Stock", "Categoría", "Estado"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f0f0f0]">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-zinc-100 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Package className="size-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-zinc-500">No hay productos con estos filtros.</p>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-[#f0f0f0] hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-[#0a0a0a]">{product.name}</p>
                    {product.description && (
                      <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">{product.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-600">{product.club_name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-black text-[#0a0a0a]">{formatCurrency(product.price)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-[#0a0a0a]">
                      {product.stock === -1 ? "Ilimitado" : product.stock}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full
                      ${product.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                      }`}>
                      {product.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#f0f0f0]">
          <p className="text-xs text-zinc-500 font-medium">
            {total} productos · Página {page} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="size-8 rounded-lg border border-[#e5e5e5] flex items-center justify-center
                disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              <ChevronLeft className="size-4 text-zinc-500" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="size-8 rounded-lg border border-[#e5e5e5] flex items-center justify-center
                disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              <ChevronRight className="size-4 text-zinc-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── main view ──────────────────────────────────────────────────────────────────

interface AdminShopViewProps {
  clubs: { id: string; name: string }[]
}

type Tab = "orders" | "products"

export function AdminShopView({ clubs }: AdminShopViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("orders")

  // Orders state
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersClubFilter, setOrdersClubFilter] = useState("")
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("")
  const [ordersLoading, ordersTransition] = useTransition()

  // Products state
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [productsTotal, setProductsTotal] = useState(0)
  const [productsPage, setProductsPage] = useState(1)
  const [productsClubFilter, setProductsClubFilter] = useState("")
  const [productsLoading, productsTransition] = useTransition()

  // Shared stats
  const [stats, setStats] = useState<AdminShopStats>({
    total_revenue: 0,
    pending_orders: 0,
    active_products: 0,
  })

  const LIMIT = 20

  const fetchOrders = useCallback(
    (page: number, clubId: string, status: string) => {
      ordersTransition(async () => {
        try {
          const params = new URLSearchParams({ type: "orders", page: String(page) })
          if (clubId) params.set("club_id", clubId)
          if (status) params.set("status", status)

          const res = await fetch(`/api/admin/shop?${params.toString()}`)
          const json = await res.json()
          if (json.success && json.data) {
            const shopData = json.data as AdminShopData
            setOrders(shopData.orders ?? [])
            setOrdersTotal(shopData.meta.total)
            setStats(shopData.stats)
          }
        } catch {
          // errors are silently ignored — tables show empty state
        }
      })
    },
    [ordersTransition]
  )

  const fetchProducts = useCallback(
    (page: number, clubId: string) => {
      productsTransition(async () => {
        try {
          const params = new URLSearchParams({ type: "products", page: String(page) })
          if (clubId) params.set("club_id", clubId)

          const res = await fetch(`/api/admin/shop?${params.toString()}`)
          const json = await res.json()
          if (json.success && json.data) {
            const shopData = json.data as AdminShopData
            setProducts(shopData.products ?? [])
            setProductsTotal(shopData.meta.total)
            setStats(shopData.stats)
          }
        } catch {
          // errors are silently ignored
        }
      })
    },
    [productsTransition]
  )

  // Initial load
  useEffect(() => {
    fetchOrders(1, "", "")
  }, [fetchOrders])

  function handleOrdersPage(page: number) {
    setOrdersPage(page)
    fetchOrders(page, ordersClubFilter, ordersStatusFilter)
  }

  function handleOrdersClub(clubId: string) {
    setOrdersClubFilter(clubId)
    setOrdersPage(1)
    fetchOrders(1, clubId, ordersStatusFilter)
  }

  function handleOrdersStatus(status: string) {
    setOrdersStatusFilter(status)
    setOrdersPage(1)
    fetchOrders(1, ordersClubFilter, status)
  }

  function handleProductsPage(page: number) {
    setProductsPage(page)
    fetchProducts(page, productsClubFilter)
  }

  function handleProductsClub(clubId: string) {
    setProductsClubFilter(clubId)
    setProductsPage(1)
    fetchProducts(1, clubId)
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    if (tab === "products" && products.length === 0) {
      fetchProducts(1, "")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <StatsCards stats={stats} />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
        {[
          { id: "orders" as Tab, label: "Órdenes", icon: ShoppingBag },
          { id: "products" as Tab, label: "Productos", icon: Package },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-colors
                ${isActive
                  ? "bg-white text-[#0a0a0a] shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
                }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "orders" && (
        <OrdersTable
          orders={orders}
          clubs={clubs}
          loading={ordersLoading}
          page={ordersPage}
          total={ordersTotal}
          limit={LIMIT}
          onPageChange={handleOrdersPage}
          onClubFilter={handleOrdersClub}
          onStatusFilter={handleOrdersStatus}
          clubFilter={ordersClubFilter}
          statusFilter={ordersStatusFilter}
        />
      )}

      {activeTab === "products" && (
        <ProductsTable
          products={products}
          clubs={clubs}
          loading={productsLoading}
          page={productsPage}
          total={productsTotal}
          limit={LIMIT}
          onPageChange={handleProductsPage}
          onClubFilter={handleProductsClub}
          clubFilter={productsClubFilter}
        />
      )}
    </div>
  )
}
