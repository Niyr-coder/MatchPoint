// src/components/dashboard/shop/SellForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ProductCategory = "equipment" | "membership" | "class" | "other"

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  equipment: "Equipamiento",
  membership: "Membresía",
  class: "Clase",
  other: "Otro",
}

interface SellFormProps {
  clubId: string
  isVerified: boolean
}

export function SellForm({ clubId, isVerified }: SellFormProps) {
  const router = useRouter()
  const [values, setValues] = useState({
    name: "",
    description: "",
    price: 0,
    category: "equipment" as ProductCategory,
    stock: -1,
    image_url: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, club_id: clubId }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok || !json.success) {
      setError(json.error ?? "Error al enviar")
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-center space-y-2">
        <p className="text-green-700 font-semibold">
          {isVerified ? "¡Producto publicado!" : "¡Producto enviado para revisión!"}
        </p>
        <p className="text-sm text-green-600">
          {isVerified
            ? "Tu producto ya está disponible en la tienda."
            : "Un administrador revisará tu producto pronto."}
        </p>
        <button
          onClick={() => router.push("/dashboard/shop")}
          className="text-sm text-green-700 underline"
        >
          Ir a la tienda
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg">
      {!isVerified && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
          Tu producto será revisado por un administrador antes de publicarse.
        </div>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Publicar producto"}
        </button>
      </form>
    </div>
  )
}
