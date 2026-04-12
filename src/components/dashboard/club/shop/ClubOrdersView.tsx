// src/components/dashboard/club/shop/ClubOrdersView.tsx
"use client"

import { useEffect, useState, useTransition } from "react"

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  user_name: string
  user_email: string
  total: number
  status: string
  proof_url: string | null
  created_at: string
  items: OrderItem[]
}

interface ClubOrdersViewProps {
  clubId: string
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending:       { label: "Pendiente",   className: "bg-zinc-100 text-zinc-700" },
  pending_proof: { label: "Comprobante", className: "bg-yellow-100 text-yellow-700" },
  confirmed:     { label: "Confirmado",  className: "bg-blue-100 text-blue-700" },
  delivered:     { label: "Entregado",   className: "bg-green-100 text-green-700" },
  cancelled:     { label: "Cancelado",   className: "bg-red-100 text-red-700" },
}

const BUTTON_CLASSES: Record<string, string> = {
  confirm: "text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 transition-colors",
  cancel:  "text-xs border border-red-200 text-red-600 rounded px-2 py-1 hover:bg-red-50 transition-colors",
  deliver: "text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 transition-colors",
}

const fmt = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })

type TargetStatus = "confirmed" | "cancelled" | "delivered"

interface OrderAction {
  label: string
  status: TargetStatus
  variant: "confirm" | "cancel" | "deliver"
}

function getActions(order: Order): OrderAction[] {
  if (order.status === "pending_proof") {
    return [
      { label: "Confirmar", status: "confirmed", variant: "confirm" },
      { label: "Rechazar",  status: "cancelled", variant: "cancel" },
    ]
  }
  if (order.status === "confirmed") {
    return [{ label: "Marcar entregado", status: "delivered", variant: "deliver" }]
  }
  if (order.status === "pending") {
    return [{ label: "Cancelar", status: "cancelled", variant: "cancel" }]
  }
  return []
}

export function ClubOrdersView({ clubId }: ClubOrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, startTransition] = useTransition()
  const [acting, setActing] = useState<string | null>(null)

  function load() {
    startTransition(async () => {
      const res = await fetch(`/api/shop/club/${clubId}/orders`)
      const json = await res.json()
      if (json.success) setOrders(json.data?.orders ?? [])
    })
  }

  useEffect(() => { load() }, [clubId])

  async function changeStatus(orderId: string, status: TargetStatus) {
    setActing(orderId)
    await fetch(`/api/shop/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setActing(null)
    load()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Órdenes del club</h2>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <p className="text-zinc-500 text-sm">No hay órdenes aún.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Productos</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-700">Total</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Comprobante</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => {
                const badge = STATUS_BADGES[o.status] ?? STATUS_BADGES.pending
                const actions = getActions(o)
                return (
                  <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{o.user_name}</div>
                      <div className="text-xs text-zinc-500">{o.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {o.items?.map((item) => `${item.product_name} ×${item.quantity}`).join(", ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{fmt.format(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.proof_url ? (
                        <a href={o.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                          Ver
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {actions.map((action) => (
                          <button
                            key={action.status}
                            onClick={() => changeStatus(o.id, action.status)}
                            disabled={acting === o.id}
                            className={BUTTON_CLASSES[action.variant]}
                          >
                            {acting === o.id ? "..." : action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
