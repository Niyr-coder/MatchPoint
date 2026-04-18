"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { VISIBLE_SPORT_OPTIONS, PRIMARY_SPORT } from "@/lib/sports/config"
import type { SportId } from "@/lib/sports/config"

type SportValue = SportId

export interface TournamentFormState {
  name: string
  clubId: string
  sport: SportValue
  modality: string
  maxParticipants: string
  entryFee: string
  startDate: string
  endDate: string
  description: string
}

export interface ClubOption {
  id: string
  name: string
}

export const EMPTY_TOURNAMENT_FORM: TournamentFormState = {
  name: "",
  clubId: "",
  sport: PRIMARY_SPORT,
  modality: "",
  maxParticipants: "16",
  entryFee: "0",
  startDate: "",
  endDate: "",
  description: "",
}

interface AdminTournamentModalProps {
  mode: "create" | "edit"
  initial: TournamentFormState
  clubs: ClubOption[]
  onClose: () => void
  onSubmit: (form: TournamentFormState) => Promise<void>
  error: string | null
  loading: boolean
}

export function AdminTournamentModal({
  mode,
  initial,
  clubs,
  onClose,
  onSubmit,
  error,
  loading,
}: AdminTournamentModalProps) {
  const [form, setForm] = useState<TournamentFormState>(initial)

  function set(key: keyof TournamentFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void onSubmit(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-lg shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black uppercase tracking-tight text-foreground">
            {mode === "create" ? "Crear torneo" : "Editar torneo"}
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              minLength={3}
              maxLength={100}
              placeholder="Torneo de Pádel Abierto…"
              className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Club */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Club <span className="text-red-500">*</span>
            </label>
            <select
              value={form.clubId}
              onChange={(e) => set("clubId", e.target.value)}
              required
              className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card"
            >
              <option value="">Seleccionar club…</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sport + Modality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Deporte <span className="text-red-500">*</span>
              </label>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value as SportValue)}
                className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card"
              >
                {VISIBLE_SPORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Modalidad
              </label>
              <input
                type="text"
                value={form.modality}
                onChange={(e) => set("modality", e.target.value)}
                maxLength={50}
                placeholder="Individual, Dobles…"
                className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>
          </div>

          {/* Max participants + Entry fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Máx. participantes <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => set("maxParticipants", e.target.value)}
                required
                min={2}
                max={256}
                className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Inscripción (USD)
              </label>
              <input
                type="number"
                value={form.entryFee}
                onChange={(e) => set("entryFee", e.target.value)}
                min={0}
                step={0.01}
                className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>
          </div>

          {/* Start date + End date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
                className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Fecha fin
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Descripción opcional del torneo…"
              className="border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-foreground text-background rounded-full py-2.5 text-sm font-bold hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? mode === "create" ? "Creando…" : "Guardando…"
                : mode === "create" ? "Crear torneo" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
