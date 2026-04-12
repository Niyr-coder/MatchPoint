"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ProductCategory = "equipment" | "membership" | "class" | "other"

interface ProductFormProps {
  clubId: string
  initialValues?: {
    name: string
    description: string
    price: number
    category: ProductCategory
    stock: number
    image_url: string
    is_active: boolean
  }
  productId?: string // if editing
  onSuccess?: () => void
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  equipment: "Equipamiento",
  membership: "Membresía",
  class: "Clase",
  other: "Otro",
}

const DEFAULT_VALUES = {
  name: "",
  description: "",
  price: 0,
  category: "equipment" as ProductCategory,
  stock: -1,
  image_url: "",
  is_active: true,
}

export function ProductForm({ clubId, initialValues, productId, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const [values, setValues] = useState(initialValues ?? DEFAULT_VALUES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const url = productId ? `/api/shop/products/${productId}` : "/api/shop/products"
    const method = productId ? "PUT" : "POST"
    const body = productId ? values : { ...values, club_id: clubId }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok || !json.success) {
      setError(json.error ?? "Error al guardar")
      return
    }

    if (onSuccess) {
      onSuccess()
    } else {
      router.push(`/dashboard/club/${clubId}/shop/products`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Nombre *</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          required
          maxLength={200}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="Nombre del producto"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Descripción</label>
        <textarea
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
          placeholder="Descripción opcional"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Precio (USD) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={values.price}
            onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
            required
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Stock (-1 = ilimitado) *</label>
          <input
            type="number"
            min={-1}
            value={values.stock}
            onChange={(e) => update("stock", parseInt(e.target.value) || -1)}
            required
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Categoría *</label>
        <select
          value={values.category}
          onChange={(e) => update("category", e.target.value as ProductCategory)}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
        >
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">URL de imagen (opcional)</label>
        <input
          type="url"
          value={values.image_url}
          onChange={(e) => update("image_url", e.target.value)}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="https://..."
        />
      </div>

      {productId && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={values.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Producto activo (visible en tienda)</label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-zinc-200 rounded-lg py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : productId ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  )
}
