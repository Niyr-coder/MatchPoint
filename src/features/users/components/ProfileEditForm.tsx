"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Loader2, Pencil, Check } from "lucide-react"
import { ECUADOR_PROVINCES, ECUADOR_CITIES_BY_PROVINCE } from "@/lib/constants"
import type { Profile } from "@/types"

const profileUpdateSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(50, "Nombre demasiado largo"),
  last_name: z.string().min(1, "El apellido es requerido").max(50, "Apellido demasiado largo"),
  phone: z
    .string()
    .min(9, "Mínimo 9 dígitos")
    .max(10, "Máximo 10 dígitos")
    .regex(/^[0-9]+$/, "Solo se permiten números"),
  city: z.string().min(1, "La ciudad es requerida").max(100),
  province: z.string().min(1, "La provincia es requerida"),
})

type ProfileFormValues = z.infer<typeof profileUpdateSchema>

interface ProfileEditFormProps {
  profile: Profile
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({})

  const [formData, setFormData] = useState<ProfileFormValues>({
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    province: profile.province ?? "",
  })

  const availableCities =
    formData.province ? (ECUADOR_CITIES_BY_PROVINCE[formData.province] ?? []) : []

  function handleChange<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value }
      // Reset city when province changes
      if (key === "province") {
        return { ...updated, city: "" }
      }
      return updated
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleCancel() {
    setEditing(false)
    setErrors({})
    setServerError(null)
    setFormData({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      province: profile.province ?? "",
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    setServerError(null)

    const parsed = profileUpdateSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ProfileFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileFormValues
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const json = await res.json()
      if (!json.success) {
        setServerError(json.error ?? "Error desconocido")
        return
      }
      setSuccessMsg("Perfil actualizado")
      setEditing(false)
      router.refresh()
    } catch {
      setServerError("Error de conexión. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!editing) {
    return (
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Información Personal
          </p>
          <button
            onClick={() => {
              setSuccessMsg(null)
              setEditing(true)
            }}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 border border-[#e5e5e5] rounded-full text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="size-3" />
            Editar
          </button>
        </div>

        {successMsg && (
          <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-2.5 flex items-center gap-2 text-sm text-[#16a34a]">
            <Check className="size-3.5" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Nombre" value={profile.first_name} />
          <InfoRow label="Apellido" value={profile.last_name} />
          <InfoRow label="Teléfono" value={profile.phone} />
          <InfoRow label="Ciudad" value={profile.city} />
          <InfoRow label="Provincia" value={profile.province} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-5">
        Editar Información
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {serverError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Nombre
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            />
            {errors.first_name && (
              <p className="text-[11px] text-red-500">{errors.first_name}</p>
            )}
          </div>

          {/* Last name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Apellido
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            />
            {errors.last_name && (
              <p className="text-[11px] text-red-500">{errors.last_name}</p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Teléfono
            </label>
            <input
              type="tel"
              maxLength={10}
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, ""))}
              className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
            />
            {errors.phone && (
              <p className="text-[11px] text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Province */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Provincia
            </label>
            <select
              value={formData.province}
              onChange={(e) => handleChange("province", e.target.value)}
              className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white appearance-none cursor-pointer"
            >
              <option value="">Seleccionar provincia</option>
              {ECUADOR_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.province && (
              <p className="text-[11px] text-red-500">{errors.province}</p>
            )}
          </div>

          {/* City */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Ciudad
            </label>
            <select
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              disabled={availableCities.length === 0}
              className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar ciudad</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.city && (
              <p className="text-[11px] text-red-500">{errors.city}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 border border-[#e5e5e5] rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-[#1a56db] hover:bg-[#1648c0] text-white rounded-full py-2.5 text-[11px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-[#0a0a0a]">{value || "—"}</p>
    </div>
  )
}
