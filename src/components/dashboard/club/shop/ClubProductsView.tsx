// src/components/dashboard/club/shop/ClubProductsView.tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
  is_active: boolean
  approval_status: string
  created_at: string
}

interface ClubProductsViewProps {
  clubId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  equipment: "Equipamiento",
  membership: "Membresía",
  class: "Clase",
  other: "Otro",
}

const APPROVAL_BADGES: Record<string, { label: string; className: string }> = {
  approved:         { label: "Activo",     className: "bg-green-100 text-green-700" },
  pending_approval: { label: "Pendiente",  className: "bg-yellow-100 text-yellow-700" },
  rejected:         { label: "Rechazado",  className: "bg-red-100 text-red-700" },
}

const fmt = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" })

export function ClubProductsView({ clubId }: ClubProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, startTransition] = useTransition()
  const [archiving, setArchiving] = useState<string | null>(null)

  function load() {
    startTransition(async () => {
      const res = await fetch(`/api/shop/club/${clubId}/products`)
      const json = await res.json()
      if (json.success) setProducts(json.data ?? [])
    })
  }

  useEffect(() => { load() }, [clubId])

  async function archive(productId: string) {
    if (!confirm("¿Archivar este producto? Dejará de aparecer en la tienda.")) return
    setArchiving(productId)
    await fetch(`/api/shop/products/${productId}`, { method: "DELETE" })
    setArchiving(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Productos del club</h2>
        <Link
          href={`/dashboard/club/${clubId}/shop/products/new`}
          className="bg-zinc-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      {loading && <p className="text-sm text-zinc-500">Cargando...</p>}

      {!loading && products.length === 0 && (
        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <p className="text-zinc-500 text-sm">No hay productos aún.</p>
          <Link
            href={`/dashboard/club/${clubId}/shop/products/new`}
            className="text-sm text-zinc-900 font-medium underline mt-2 inline-block"
          >
            Crea el primero
          </Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-700">Precio</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-700">Stock</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-700">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((p) => {
                const badge = APPROVAL_BADGES[p.approval_status] ?? APPROVAL_BADGES.approved
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td className="px-4 py-3 text-right text-zinc-900">{fmt.format(p.price)}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {p.stock === -1 ? "Ilimitado" : p.stock}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/dashboard/club/${clubId}/shop/products/${p.id}/edit`}
                        className="text-xs text-zinc-600 hover:text-zinc-900 underline"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => archive(p.id)}
                        disabled={archiving === p.id}
                        className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
                      >
                        {archiving === p.id ? "..." : "Archivar"}
                      </button>
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
