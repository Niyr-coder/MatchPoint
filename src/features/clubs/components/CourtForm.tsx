"use client"

import { useState } from "react"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { SPORT_IDS, SPORT_LABELS, VISIBLE_SPORT_IDS, SINGLE_SPORT_MODE } from "@/lib/sports/config"
import type { Court } from "@/features/clubs/types"

const courtFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "Nombre demasiado largo"),
  sport: z.enum(SPORT_IDS, { error: "Selecciona un deporte" }),
  surface_type: z.string().max(100).optional(),
  is_indoor: z.boolean(),
  price_per_hour: z
    .number()
    .min(0, "El precio debe ser positivo"),
})

type CourtFormValues = z.infer<typeof courtFormSchema>

interface CourtFormProps {
  court?: Court
  clubId: string
  onSuccess: () => void
  onCancel: () => void
}

export function CourtForm({ court, clubId, onSuccess, onCancel }: CourtFormProps) {
  const isEdit = Boolean(court)

  const [formData, setFormData] = useState<CourtFormValues>({
    name: court?.name ?? "",
    sport: (court?.sport as CourtFormValues["sport"]) ?? VISIBLE_SPORT_IDS[0],
    surface_type: court?.surface_type ?? "",
    is_indoor: court?.is_indoor ?? false,
    price_per_hour: court?.price_per_hour ?? 0,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CourtFormValues, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange<K extends keyof CourtFormValues>(
    key: K,
    value: CourtFormValues[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const parsed = courtFormSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CourtFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CourtFormValues
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const url = isEdit
        ? `/api/club/${clubId}/courts/${court!.id}`
        : `/api/club/${clubId}/courts`

      const method = isEdit ? "PATCH" : "POST"

      const payload = {
        ...parsed.data,
        surface_type: parsed.data.surface_type || undefined,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!json.success) {
        setServerError(json.error ?? "Error desconocido")
        return
      }

      onSuccess()
    } catch {
      setServerError("Error de conexión. Intenta de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      {serverError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Nombre de la cancha
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Cancha 1"
          className="border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/8 bg-card"
        />
        {errors.name && (
          <p className="text-[11px] text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Sport — hidden when only one sport is active */}
      {!SINGLE_SPORT_MODE && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Deporte
          </label>
          <select
            value={formData.sport}
            onChange={(e) =>
              handleChange("sport", e.target.value as CourtFormValues["sport"])
            }
            className="border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/8 bg-card appearance-none cursor-pointer"
          >
            {VISIBLE_SPORT_IDS.map((id) => (
              <option key={id} value={id}>
                {SPORT_LABELS[id]}
              </option>
            ))}
          </select>
          {errors.sport && (
            <p className="text-[11px] text-red-500">{errors.sport}</p>
          )}
        </div>
      )}

      {/* Surface type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Tipo de superficie{" "}
          <span className="font-normal normal-case tracking-normal text-zinc-400">
            (opcional)
          </span>
        </label>
        <input
          type="text"
          value={formData.surface_type ?? ""}
          onChange={(e) => handleChange("surface_type", e.target.value)}
          placeholder="Ej: Cemento, Arcilla, Sintético..."
          className="border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/8 bg-card"
        />
        {errors.surface_type && (
          <p className="text-[11px] text-red-500">{errors.surface_type}</p>
        )}
      </div>

      {/* Price per hour */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
          Precio por hora (USD)
        </label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={formData.price_per_hour}
          onChange={(e) =>
            handleChange("price_per_hour", parseFloat(e.target.value) || 0)
          }
          className="border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/8 bg-card"
        />
        {errors.price_per_hour && (
          <p className="text-[11px] text-red-500">{errors.price_per_hour}</p>
        )}
      </div>

      {/* Indoor toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            checked={formData.is_indoor}
            onChange={(e) => handleChange("is_indoor", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-6 rounded-full bg-zinc-200 peer-checked:bg-foreground transition-colors" />
          <div className="absolute top-1 left-1 size-4 rounded-full bg-card shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-bold text-foreground">
          Cancha cubierta (indoor)
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-foreground text-white rounded-full py-2.5 text-[11px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-[#222] transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Crear cancha"}
        </button>
      </div>
    </form>
  )
}
