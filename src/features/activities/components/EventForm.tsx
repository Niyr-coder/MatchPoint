"use client"

import { useState } from "react"
import { X, Plus } from "lucide-react"
import {
  SPORTS,
  EVENT_TYPES,
  EVENT_VISIBILITIES,
} from "@/features/activities/constants"
import { SINGLE_SPORT_MODE, VISIBLE_SPORT_IDS } from "@/lib/sports/config"
import { ECUADOR_PROVINCES, ECUADOR_CITIES_BY_PROVINCE } from "@/lib/constants"
import type { EventType, EventStatus, EventVisibility } from "@/features/activities/types"

// ── helpers ────────────────────────────────────────────────────────────────────

/** Find which province a city belongs to (used to restore province when editing) */
function findProvinceByCity(city: string): string {
  if (!city) return ""
  for (const [province, cities] of Object.entries(ECUADOR_CITIES_BY_PROVINCE)) {
    if (cities.includes(city)) return province
  }
  return ""
}

// ── types ──────────────────────────────────────────────────────────────────────

export interface EventFormState {
  title: string
  description: string
  event_type: EventType
  sport: string
  club_id: string
  city: string
  location: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  image_url: string
  max_capacity: string
  is_free: boolean
  price: string
  visibility: EventVisibility
  registration_deadline: string
  min_participants: string
  organizer_name: string
  organizer_contact: string
  tags: string[]
}

export const EMPTY_EVENT_FORM: EventFormState = {
  title: "",
  description: "",
  event_type: "social",
  sport: SINGLE_SPORT_MODE ? VISIBLE_SPORT_IDS[0] : "",
  club_id: "",
  city: "",
  location: "",
  start_date: "",
  start_time: "09:00",
  end_date: "",
  end_time: "",
  image_url: "",
  max_capacity: "",
  is_free: true,
  price: "",
  visibility: "public",
  registration_deadline: "",
  min_participants: "",
  organizer_name: "",
  organizer_contact: "",
  tags: [],
}

interface ClubOption {
  id: string
  name: string
}

interface EventFormProps {
  initial: EventFormState
  clubs?: ClubOption[]
  mode: "create" | "edit"
  loading: boolean
  error: string | null
  onSubmit: (form: EventFormState) => Promise<void>
  onCancel: () => void
}

// ── TagInput ───────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState("")

  function addTag() {
    const trimmed = input.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed) || tags.length >= 10) return
    onChange([...tags, trimmed])
    setInput("")
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-[#e5e5e5] rounded-xl min-h-[42px] focus-within:border-[#0a0a0a] focus-within:ring-2 focus-within:ring-[#0a0a0a]/8">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[11px] font-bold bg-zinc-100 text-zinc-700 rounded-full px-2 py-0.5"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Añadir etiquetas (Enter o coma)…" : ""}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-zinc-400"
      />
      {input && (
        <button
          type="button"
          onClick={addTag}
          className="text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// ── field helpers ──────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-wide text-zinc-500">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

const inputCls =
  "border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white w-full"

// ── EventForm ──────────────────────────────────────────────────────────────────

export function EventForm({
  initial,
  clubs = [],
  mode,
  loading,
  error,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [form, setForm] = useState<EventFormState>(initial)
  const [province, setProvince] = useState<string>(() => findProvinceByCity(initial.city))

  const availableCities = province ? (ECUADOR_CITIES_BY_PROVINCE[province] ?? []) : []

  function set<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleProvinceChange(value: string) {
    setProvince(value)
    set("city", "")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label required>Título</Label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder="Clínica de Pádel para principiantes…"
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label>Descripción</Label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Describe el evento, qué incluye, qué llevar…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Type + Sport */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label required>Tipo de evento</Label>
          <select
            value={form.event_type}
            onChange={(e) => set("event_type", e.target.value as EventType)}
            required
            className={inputCls}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {!SINGLE_SPORT_MODE && (
          <div className="flex flex-col gap-1.5">
            <Label>Deporte</Label>
            <select
              value={form.sport}
              onChange={(e) => set("sport", e.target.value)}
              className={inputCls}
            >
              <option value="">Todos los deportes</option>
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Club */}
      {clubs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Club organizador</Label>
          <select
            value={form.club_id}
            onChange={(e) => set("club_id", e.target.value)}
            className={inputCls}
          >
            <option value="">Sin club asociado</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Province → City → Location */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Provincia</Label>
          <select
            value={province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer`}
          >
            <option value="">Seleccionar provincia...</option>
            {ECUADOR_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Ciudad{!province ? <span className="font-normal normal-case ml-1 text-zinc-400 tracking-normal">(elige provincia)</span> : ""}</Label>
          <select
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            disabled={!province}
            className={`${inputCls} appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <option value="">{province ? "Seleccionar ciudad..." : "— Primero elige provincia —"}</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Ubicación</Label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          maxLength={150}
          placeholder="Club Deportivo Norte, Cancha 3"
          className={inputCls}
        />
      </div>

      {/* Start date + time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label required>Fecha inicio</Label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Hora inicio</Label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* End date + time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Fecha fin</Label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Hora fin</Label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => set("end_time", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Image URL */}
      <div className="flex flex-col gap-1.5">
        <Label>URL de imagen</Label>
        <input
          type="url"
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </div>

      {/* Capacity + Min participants */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Capacidad máxima</Label>
          <input
            type="number"
            value={form.max_capacity}
            onChange={(e) => set("max_capacity", e.target.value)}
            min={1}
            max={10000}
            placeholder="Sin límite"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Mínimo de participantes</Label>
          <input
            type="number"
            value={form.min_participants}
            onChange={(e) => set("min_participants", e.target.value)}
            min={1}
            placeholder="—"
            className={inputCls}
          />
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-2">
        <Label>Precio</Label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_free}
              onChange={(e) => set("is_free", e.target.checked)}
              className="size-4 rounded accent-[#0a0a0a]"
            />
            <span className="text-sm text-zinc-700 font-medium">Evento gratuito</span>
          </label>
        </div>
        {!form.is_free && (
          <input
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            min={0}
            step={0.01}
            placeholder="Precio en USD"
            className={inputCls}
          />
        )}
      </div>

      {/* Visibility + Registration deadline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Visibilidad</Label>
          <select
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value as EventVisibility)}
            className={inputCls}
          >
            {EVENT_VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Límite de registro</Label>
          <input
            type="date"
            value={form.registration_deadline}
            onChange={(e) => set("registration_deadline", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Organizer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Nombre del organizador</Label>
          <input
            type="text"
            value={form.organizer_name}
            onChange={(e) => set("organizer_name", e.target.value)}
            maxLength={100}
            placeholder="Juan Pérez"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Contacto del organizador</Label>
          <input
            type="text"
            value={form.organizer_contact}
            onChange={(e) => set("organizer_contact", e.target.value)}
            maxLength={150}
            placeholder="WhatsApp o email"
            className={inputCls}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <Label>Etiquetas</Label>
        <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
        <p className="text-[10px] text-zinc-400">Máximo 10 etiquetas</p>
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
          onClick={onCancel}
          disabled={loading}
          className="flex-1 border border-[#e5e5e5] rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#0a0a0a] text-white rounded-full py-2.5 text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading
            ? mode === "create" ? "Creando…" : "Guardando…"
            : mode === "create" ? "Crear evento" : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}

// ── EventFormModal ─────────────────────────────────────────────────────────────

interface EventFormModalProps extends EventFormProps {
  title: string
}

export function EventFormModal({
  title,
  onCancel,
  ...formProps
}: EventFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl bg-white border border-[#e5e5e5] p-6 w-full max-w-2xl shadow-xl my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black uppercase tracking-tight text-[#0a0a0a]">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="size-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>
        <EventForm onCancel={onCancel} {...formProps} />
      </div>
    </div>
  )
}
