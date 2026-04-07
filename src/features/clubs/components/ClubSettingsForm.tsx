"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ECUADOR_PROVINCES, ECUADOR_CITIES_BY_PROVINCE } from "@/lib/constants"
import type { Club } from "@/types"

interface ClubSettingsFormProps {
  club: Club
  clubId: string
}

export function ClubSettingsForm({ club, clubId }: ClubSettingsFormProps) {
  const [form, setForm] = useState({
    name: club.name ?? "",
    description: club.description ?? "",
    address: club.address ?? "",
    city: club.city ?? "",
    province: club.province ?? "",
    phone: club.phone ?? "",
    logo_url: club.logo_url ?? "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      // reset city when province changes
      ...(field === "province" ? { city: "" } : {}),
    }))
    setSuccess(false)
    setError(null)
  }

  const availableCities = form.province ? (ECUADOR_CITIES_BY_PROVINCE[form.province] ?? []) : []

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/club/${clubId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || null,
          address: form.address || null,
          city: form.city || null,
          province: form.province || null,
          phone: form.phone || null,
          logo_url: form.logo_url || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Error al guardar")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Error de red. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate() {
    setDeactivateLoading(true)
    try {
      await fetch(`/api/club/${clubId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      })
    } finally {
      setDeactivateLoading(false)
    }
  }

  const inputClass =
    "border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white w-full"

  const labelClass = "text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400"

  return (
    <div className="flex flex-col gap-8">
      {/* General info */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">
          Información General
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className={labelClass}>Nombre del Club</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className={labelClass}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Provincia</label>
            <select
              value={form.province}
              onChange={(e) => handleChange("province", e.target.value)}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="">Seleccionar provincia...</option>
              {ECUADOR_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`${labelClass} ${!form.province ? "opacity-40" : ""}`}>
              Ciudad{!form.province && <span className="font-normal normal-case ml-1 tracking-normal">(elige provincia primero)</span>}
            </label>
            <select
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              disabled={!form.province}
              className={`${inputClass} appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <option value="">{form.province ? "Seleccionar ciudad..." : "— Primero elige una provincia —"}</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className={labelClass}>URL del Logo</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => handleChange("logo_url", e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 font-bold mt-3">{error}</p>
        )}
        {success && (
          <p className="text-xs text-[#16a34a] font-bold mt-3">Cambios guardados correctamente.</p>
        )}

        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#0a0a0a] hover:bg-[#222222] text-white rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] disabled:opacity-50 transition-colors"
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl bg-white border border-red-200 p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-1">
          Zona Peligrosa
        </p>
        <p className="text-sm font-black text-[#0a0a0a] mb-1">Desactivar Club</p>
        <p className="text-sm text-zinc-500 mb-4">
          Al desactivar el club, todos los miembros perderán acceso. Esta acción puede revertirse
          contactando a soporte.
        </p>
        <button
          onClick={() => setDeactivateOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
        >
          Desactivar Club
        </button>
      </div>

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Desactivar Club"
        description="¿Estás seguro de que deseas desactivar este club? Todos los miembros perderán el acceso."
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
      />
    </div>
  )
}
