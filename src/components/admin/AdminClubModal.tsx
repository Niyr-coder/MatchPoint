"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, X } from "lucide-react"
import { ECUADOR_PROVINCES } from "@/lib/constants"

const SPORTS_OPTIONS = [
  { value: "futbol", label: "Fútbol" },
  { value: "padel", label: "Pádel" },
  { value: "tenis", label: "Tenis" },
  { value: "pickleball", label: "Pickleball" },
]

export interface ClubFormData {
  name: string
  city: string
  province: string
  description: string
  sports: string[]
}

export const EMPTY_CLUB_FORM: ClubFormData = {
  name: "",
  city: "",
  province: "",
  description: "",
  sports: [],
}

export function validateClubForm(form: ClubFormData): string | null {
  if (form.name.trim().length < 2) return "El nombre debe tener al menos 2 caracteres."
  if (form.city.trim().length < 2) return "La ciudad debe tener al menos 2 caracteres."
  if (!form.province) return "Selecciona una provincia."
  return null
}

interface AdminClubModalProps {
  mode: "create" | "edit"
  initial: ClubFormData
  onClose: () => void
  onSave: (form: ClubFormData) => Promise<void>
  loading: boolean
  error: string | null
}

export function AdminClubModal({ mode, initial, onClose, onSave, loading, error }: AdminClubModalProps) {
  const [form, setForm] = useState<ClubFormData>(initial)
  const [validationError, setValidationError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [loading, onClose])

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!loading && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  function handleSportToggle(value: string) {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.includes(value)
        ? prev.sports.filter((s) => s !== value)
        : [...prev.sports, value],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateClubForm(form)
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError(null)
    await onSave(form)
  }

  const displayError = validationError ?? error

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <p
            id="club-modal-title"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400"
          >
            {mode === "create" ? "Crear club" : "Editar club"}
          </p>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
            className="size-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Nombre del club <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej. Club Deportivo Quito"
                className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card"
                disabled={loading}
                maxLength={100}
              />
            </div>

            {/* City */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Ej. Quito"
                className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card"
                disabled={loading}
                maxLength={100}
              />
            </div>

            {/* Province */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Provincia <span className="text-red-500">*</span>
              </label>
              <select
                value={form.province}
                onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card appearance-none cursor-pointer"
                disabled={loading}
              >
                <option value="">Selecciona una provincia</option>
                {ECUADOR_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Descripción <span className="text-zinc-400 font-normal normal-case">(opcional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descripción del club..."
                rows={3}
                className="border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card resize-none"
                disabled={loading}
                maxLength={500}
              />
              <p className="text-[10px] text-zinc-400 text-right">{form.description.length}/500</p>
            </div>

            {/* Sports */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Deportes <span className="text-zinc-400 font-normal normal-case">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SPORTS_OPTIONS.map((sport) => {
                  const active = form.sports.includes(sport.value)
                  return (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() => handleSportToggle(sport.value)}
                      disabled={loading}
                      className={`text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                        active
                          ? "bg-foreground border-foreground text-white"
                          : "border-border text-zinc-500 hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {sport.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {displayError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-muted transition-colors disabled:opacity-50 bg-card"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-foreground hover:bg-foreground/90 text-white rounded-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "create" ? "Crear club" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
