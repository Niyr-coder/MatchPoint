"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Loader2, Check } from "lucide-react"
import type { Profile } from "@/types"

const SPORTS = ["Fútbol", "Pádel", "Tenis", "Pickleball"] as const
type Sport = (typeof SPORTS)[number]

const accountFormSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido").max(50, "Nombre demasiado largo"),
  last_name: z.string().min(1, "El apellido es requerido").max(50, "Apellido demasiado largo"),
  phone: z
    .string()
    .min(9, "Mínimo 9 dígitos")
    .max(10, "Máximo 10 dígitos")
    .regex(/^[0-9]+$/, "Solo se permiten números")
    .or(z.literal("")),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface AccountFormProps {
  profile: Profile & { username?: string | null }
  email: string
}

export function AccountForm({ profile, email }: AccountFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof AccountFormValues, string>>>({})
  const [selectedSports, setSelectedSports] = useState<Sport[]>([])

  const [formData, setFormData] = useState<AccountFormValues>({
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    phone: profile.phone ?? "",
  })

  function handleChange<K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setSuccessMsg(null)
  }

  function toggleSport(sport: Sport) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMsg(null)
    setServerError(null)

    const parsed = accountFormSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof AccountFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AccountFormValues
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, string> = {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      }
      if (parsed.data.phone) payload.phone = parsed.data.phone

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!json.success) {
        setServerError(json.error ?? "Error desconocido")
        return
      }
      setSuccessMsg("Cambios guardados correctamente")
      router.refresh()
    } catch {
      setServerError("Error de conexión. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Personal info form */}
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-5">
          Información Personal
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {serverError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-2.5 flex items-center gap-2 text-sm text-[#16a34a]">
              <Check className="size-3.5 shrink-0" />
              {successMsg}
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

            {/* Username (read-only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profile.username ? `@${profile.username}` : "—"}
                  readOnly
                  className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm bg-zinc-50 text-zinc-400 w-full cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-zinc-400">El nombre de usuario no se puede cambiar por ahora</p>
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
                placeholder="0999999999"
                className="border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
              />
              {errors.phone && (
                <p className="text-[11px] text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Favorite sports */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Deportes favoritos
            </label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((sport) => {
                const active = selectedSports.includes(sport)
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border transition-colors ${
                      active
                        ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                        : "bg-white text-zinc-600 border-[#e5e5e5] hover:border-zinc-300"
                    }`}
                  >
                    {sport}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-zinc-400">Selecciona los deportes que practicas</p>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1a56db] hover:bg-[#1648c0] text-white rounded-full px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl bg-white border border-red-200 p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-1">
          Zona de peligro
        </p>
        <p className="text-lg font-black text-[#0a0a0a] mb-4">Acciones de cuenta</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/auth/signout"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-[#e5e5e5] text-[11px] font-black uppercase tracking-[0.15em] text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cerrar sesión
          </a>
          <button
            type="button"
            disabled
            title="Contacta soporte para eliminar tu cuenta"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-red-200 text-[11px] font-black uppercase tracking-[0.15em] text-red-400 opacity-50 cursor-not-allowed"
          >
            Eliminar cuenta
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-3">
          Para eliminar tu cuenta, contacta a soporte.
        </p>
      </div>
    </div>
  )
}
