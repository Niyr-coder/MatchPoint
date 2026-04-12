// src/components/dashboard/shop/UserOrdersView.tsx
"use client"

import { useEffect, useState, useTransition } from "react"

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
}

interface UserOrder {
  id: string
  total: number
  status: string
  proof_url: string | null
  created_at: string
  order_items: OrderItem[]
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending:       { label: "Pendiente pago", className: "bg-zinc-100 text-zinc-600" },
  pending_proof: { label: "En revisión",    className: "bg-yellow-100 text-yellow-700" },
  confirmed:     { label: "Confirmado",     className: "bg-blue-100 text-blue-700" },
  delivered:     { label: "Entregado",      className: "bg-green-100 text-green-700" },
  cancelled:     { label: "Cancelado",      className: "bg-red-100 text-red-700" },
}

const fmt = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })

export function UserOrdersView() {
  const [orders, setOrders] = useState<UserOrder[]>([])
  const [loading, startTransition] = useTransition()
  const [proofInputs, setProofInputs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  function load() {
    startTransition(async () => {
      const res = await fetch("/api/shop/orders")
      const json = await res.json()
      if (json.success) setOrders(json.data ?? [])
    })
  }

  useEffect(() => { load() }, [])

  async function submitProof(orderId: string) {
    const url = proofInputs[orderId]?.trim()
    if (!url) return
    setSubmitting(orderId)
    setProofError(null)

    const res = await fetch(`/api/shop/orders/${orderId}/proof`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof_url: url }),
    })

    const json = await res.json()
    setSubmitting(null)

    if (!res.ok || !json.success) {
      setProofError(json.error ?? "Error al enviar comprobante")
      return
    }

    setProofInputs((prev) => ({ ...prev, [orderId]: "" }))
    load()
  }

  if (loading) {
    return <p className="text-sm text-zinc-500 py-8 text-center">Cargando pedidos...</p>
  }

  if (orders.length === 0) {
    return (
      <div className="border border-zinc-200 rounded-lg p-8 text-center">
        <p className="text-zinc-500 text-sm">No tienes pedidos aún.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {proofError && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {proofError}
        </div>
      )}

      {orders.map((order) => {
        const badge = STATUS_BADGES[order.status] ?? STATUS_BADGES.pending
        return (
          <div key={order.id} className="border border-zinc-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">{fmtDate(order.created_at)}</p>
                <p className="font-semibold text-zinc-900">{fmt.format(order.total)}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            <ul className="text-sm text-zinc-600 space-y-0.5">
              {order.order_items.map((item, i) => (
                <li key={i}>
                  {item.product_name} × {item.quantity} — {fmt.format(item.unit_price * item.quantity)}
                </li>
              ))}
            </ul>

            {order.status === "pending" && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-zinc-500">
                  Pega aquí la URL de tu comprobante de pago (captura, Google Drive, etc.)
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={proofInputs[order.id] ?? ""}
                    onChange={(e) =>
                      setProofInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                    }
                    placeholder="https://..."
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    onClick={() => submitProof(order.id)}
                    disabled={submitting === order.id || !proofInputs[order.id]?.trim()}
                    className="bg-zinc-900 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {submitting === order.id ? "..." : "Enviar"}
                  </button>
                </div>
              </div>
            )}

            {order.proof_url && order.status !== "pending" && (
              <p className="text-xs text-zinc-500">
                Comprobante enviado:{" "}
                <a href={order.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  ver
                </a>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
