"use client"

import { useState } from "react"
import { ECUADOR_PROVINCES } from "@/lib/constants"
import { Loader2 } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  city: string
  province: string
  description: string
  sports: string[]
  contactPhone: string
  contactEmail: string
}

interface FormErrors {
  name?: string
  city?: string
  province?: string
  sports?: string
  contactEmail?: string
}

const SPORTS_OPTIONS = [
  { value: "futbol", label: "Fútbol", emoji: "⚽" },
  { value: "padel", label: "Pádel", emoji: "🏓" },
  { value: "tenis", label: "Tenis", emoji: "🎾" },
  { value: "pickleball", label: "Pickleball", emoji: "🏸" },
]

const INITIAL_FORM: FormState = {
  name: "",
  city: "",
  province: "",
  description: "",
  sports: [],
  contactPhone: "",
  contactEmail: "",
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {}

  if (state.name.trim().length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres"
  }
  if (state.city.trim().length === 0) {
    errors.city = "La ciudad es requerida"
  }
  if (state.province.trim().length === 0) {
    errors.province = "La provincia es requerida"
  }
  if (state.sports.length === 0) {
    errors.sports = "Debes seleccionar al menos un deporte"
  }
  if (
    state.contactEmail.trim().length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contactEmail.trim())
  ) {
    errors.contactEmail = "Email de contacto inválido"
  }

  return errors
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClubRequestForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function toggleSport(value: string) {
    setForm((prev) => {
      const next = prev.sports.includes(value)
        ? prev.sports.filter((s) => s !== value)
        : [...prev.sports, value]
      return { ...prev, sports: next }
    })
    setErrors((prev) => ({ ...prev, sports: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch("/api/club-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),
          province: form.province,
          description: form.description.trim() || null,
          sports: form.sports,
          contactPhone: form.contactPhone.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
        }),
      })

      const json: { success: boolean; error?: string | null } = await res.json()

      if (!json.success) {
        setSubmitError(json.error ?? "Error al enviar la solicitud")
        return
      }

      setSubmitted(true)
    } catch {
      setSubmitError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-8 flex flex-col items-center gap-4 text-center">
        <div className="size-14 rounded-full bg-green-50 flex items-center justify-center">
          <span className="text-2xl">✅</span>
        </div>
        <div>
          <p className="text-lg font-black text-[#0a0a0a] uppercase tracking-[-0.02em]">
            Solicitud enviada
          </p>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-sm">
            Tu solicitud fue enviada. El equipo de MATCHPOINT la revisará pronto y te contactará por correo electrónico.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-6">

      {/* Club name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
          Nombre del club <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Ej. Club Deportivo Quito Norte"
          className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      {/* City + Province */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
            Ciudad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Ej. Quito"
            className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
          />
          {errors.city && (
            <p className="text-xs text-red-600">{errors.city}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
            Provincia <span className="text-red-500">*</span>
          </label>
          <select
            value={form.province}
            onChange={(e) => updateField("province", e.target.value)}
            className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white appearance-none cursor-pointer"
          >
            <option value="">Seleccionar provincia...</option>
            {ECUADOR_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.province && (
            <p className="text-xs text-red-600">{errors.province}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
          Descripción
          <span className="ml-1.5 font-medium normal-case text-zinc-400">(opcional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="¿Qué hace especial a tu club?"
          rows={3}
          className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 resize-none"
        />
      </div>

      {/* Sports checkboxes */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
          Deportes <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SPORTS_OPTIONS.map((sport) => {
            const selected = form.sports.includes(sport.value)
            return (
              <button
                key={sport.value}
                type="button"
                onClick={() => toggleSport(sport.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  selected
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "bg-white text-zinc-600 border-[#e5e5e5] hover:border-zinc-400"
                }`}
              >
                <span>{sport.emoji}</span>
                <span>{sport.label}</span>
              </button>
            )
          })}
        </div>
        {errors.sports && (
          <p className="text-xs text-red-600">{errors.sports}</p>
        )}
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
            Teléfono de contacto
            <span className="ml-1.5 font-medium normal-case text-zinc-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.contactPhone}
            onChange={(e) => updateField("contactPhone", e.target.value)}
            placeholder="Ej. +593 99 000 0000"
            className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
            Email de contacto
            <span className="ml-1.5 font-medium normal-case text-zinc-400">(opcional)</span>
          </label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
            placeholder="contacto@miclub.ec"
            className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
          />
          {errors.contactEmail && (
            <p className="text-xs text-red-600">{errors.contactEmail}</p>
          )}
        </div>
      </div>

      {/* Submit error */}
      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {submitError}
        </p>
      )}

      {/* Submit button */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#111111] text-white text-sm font-black uppercase tracking-wide hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Enviar solicitud
        </button>
      </div>
    </form>
  )
}
