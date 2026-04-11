"use client"

import { useState } from "react"
import { X, Plus, ChevronRight, ChevronLeft, Check } from "lucide-react"
import {
  SPORTS,
  EVENT_TYPES,
  EVENT_VISIBILITIES,
  EVENT_TYPE_CONFIG,
} from "@/features/activities/constants"
import { SINGLE_SPORT_MODE, VISIBLE_SPORT_IDS } from "@/lib/sports/config"
import { ECUADOR_PROVINCES, ECUADOR_CITIES_BY_PROVINCE } from "@/lib/constants"
import type { EventType, EventVisibility } from "@/features/activities/types"

// ── helpers ────────────────────────────────────────────────────────────────────

function findProvinceByCity(city: string): string {
  if (!city) return ""
  for (const [province, cities] of Object.entries(ECUADOR_CITIES_BY_PROVINCE)) {
    if (cities.includes(city)) return province
  }
  return ""
}

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
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

type SetField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void

// ── constants ──────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  social: "🎉",
  clinic: "📋",
  workshop: "🛠️",
  open_day: "🌟",
  exhibition: "🏆",
  masterclass: "👑",
  quedada: "🤝",
  ranking: "🏅",
  other: "⚡",
}

const STEP_LABELS = ["Básicos", "Fecha & lugar", "Detalles", "Extras"] as const
const TOTAL_STEPS = STEP_LABELS.length

function canGoNext(step: number, form: EventFormState): boolean {
  if (step === 1) return form.title.trim().length >= 3
  if (step === 2) return !!form.start_date
  return true
}

// ── TagInput ───────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("")

  function addTag() {
    const t = input.trim().toLowerCase()
    if (!t || tags.includes(t) || tags.length >= 10) return
    onChange([...tags, t])
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-xl min-h-[42px] focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/8 bg-card">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 text-[11px] font-bold bg-muted text-zinc-700 rounded-full px-2 py-0.5">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-zinc-400 hover:text-zinc-700 transition-colors">
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
        placeholder={tags.length === 0 ? "Añadir etiquetas…" : ""}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-zinc-400"
      />
      {input && (
        <button type="button" onClick={addTag} className="text-zinc-400 hover:text-zinc-700 transition-colors">
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
  "border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/8 bg-card w-full"

// ── StepIndicator ──────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start mb-6">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={[
                  "size-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300",
                  done
                    ? "bg-foreground text-white"
                    : active
                      ? "bg-foreground text-white shadow-[0_0_0_4px_rgba(10,10,10,0.1)]"
                      : "bg-muted text-zinc-400 border border-border",
                ].join(" ")}
              >
                {done ? <Check className="size-3.5" /> : n}
              </div>
              <span
                className={[
                  "text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
                  active ? "text-foreground" : done ? "text-zinc-400" : "text-zinc-300",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={[
                  "flex-1 h-px mx-1.5 mb-4 transition-colors duration-300",
                  done ? "bg-foreground" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Básicos ────────────────────────────────────────────────────────────

function Step1({ form, set }: { form: EventFormState; set: SetField }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label required>Nombre del evento</Label>
        <input
          autoFocus
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          minLength={3}
          maxLength={120}
          placeholder="Clínica de Pádel para principiantes…"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label required>Tipo de evento</Label>
        <div className="grid grid-cols-4 gap-2">
          {EVENT_TYPES.map((t) => {
            const cfg = EVENT_TYPE_CONFIG[t.value]
            const selected = form.event_type === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set("event_type", t.value)}
                className={[
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all",
                  selected
                    ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm ring-2 ring-offset-1 ring-current/10`
                    : "border-border bg-card text-zinc-500 hover:border-zinc-300 hover:bg-muted/30",
                ].join(" ")}
              >
                <span className="text-lg leading-none">{TYPE_EMOJI[t.value]}</span>
                <span className="text-[10px] font-bold leading-tight">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!SINGLE_SPORT_MODE && (
        <div className="flex flex-col gap-2">
          <Label>Deporte</Label>
          <div className="flex flex-wrap gap-1.5">
            {[{ value: "", label: "Todos" }, ...SPORTS].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("sport", s.value)}
                className={[
                  "px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                  form.sport === s.value
                    ? "bg-foreground text-white border-foreground"
                    : "border-border text-zinc-500 hover:border-zinc-300",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Fecha & Lugar ──────────────────────────────────────────────────────

function Step2({
  form,
  set,
  province,
  setProvince,
}: {
  form: EventFormState
  set: SetField
  province: string
  setProvince: (p: string) => void
}) {
  const [showEndDate, setShowEndDate] = useState(!!form.end_date)
  const cities = province ? (ECUADOR_CITIES_BY_PROVINCE[province] ?? []) : []

  return (
    <div className="flex flex-col gap-5">
      {/* Start */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label required>Fecha de inicio</Label>
          <div className="flex gap-0.5">
            {(
              [
                ["Hoy", 0],
                ["Mañana", 1],
                ["En 7 días", 7],
              ] as [string, number][]
            ).map(([label, offset]) => (
              <button
                key={label}
                type="button"
                onClick={() => set("start_date", dateOffset(offset))}
                className="text-[10px] font-bold text-zinc-400 hover:text-foreground px-2 py-0.5 rounded-full border border-transparent hover:border-border transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className={inputCls}
          />
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* End date toggle */}
      {!showEndDate ? (
        <button
          type="button"
          onClick={() => setShowEndDate(true)}
          className="text-xs text-zinc-400 hover:text-foreground flex items-center gap-1.5 w-fit transition-colors -mt-2"
        >
          <Plus className="size-3" />
          Añadir fecha/hora de fin
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 -mt-2">
          <div className="flex items-center justify-between">
            <Label>Fecha de fin</Label>
            <button
              type="button"
              onClick={() => {
                setShowEndDate(false)
                set("end_date", "")
                set("end_time", "")
              }}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Quitar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              className={inputCls}
            />
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => set("end_time", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Location */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Provincia</Label>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value)
                set("city", "")
              }}
              className={`${inputCls} appearance-none cursor-pointer`}
            >
              <option value="">Seleccionar...</option>
              {ECUADOR_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ciudad</Label>
            <select
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              disabled={!province}
              className={`${inputCls} appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <option value="">{province ? "Seleccionar..." : "— Elige provincia —"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Lugar exacto</Label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={150}
            placeholder="Club Deportivo Norte, Cancha 3"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Detalles ───────────────────────────────────────────────────────────

function Step3({ form, set, clubs }: { form: EventFormState; set: SetField; clubs: ClubOption[] }) {
  return (
    <div className="flex flex-col gap-5">
      {clubs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Club organizador</Label>
          <select
            value={form.club_id}
            onChange={(e) => set("club_id", e.target.value)}
            className={`${inputCls} appearance-none cursor-pointer`}
          >
            <option value="">Sin club asociado</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price toggle */}
      <div className="flex flex-col gap-2">
        <Label>Precio</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set("is_free", true)}
            className={[
              "py-2.5 rounded-xl border text-sm font-bold transition-all",
              form.is_free
                ? "bg-foreground text-white border-foreground"
                : "border-border text-zinc-500 hover:border-zinc-300",
            ].join(" ")}
          >
            Gratuito
          </button>
          <button
            type="button"
            onClick={() => set("is_free", false)}
            className={[
              "py-2.5 rounded-xl border text-sm font-bold transition-all",
              !form.is_free
                ? "bg-foreground text-white border-foreground"
                : "border-border text-zinc-500 hover:border-zinc-300",
            ].join(" ")}
          >
            Con costo
          </button>
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

      {/* Capacity */}
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
          <Label>Mínimo participantes</Label>
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

      {/* Visibility + deadline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Visibilidad</Label>
          <select
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value as EventVisibility)}
            className={`${inputCls} appearance-none cursor-pointer`}
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
    </div>
  )
}

// ── Step 4: Extras ─────────────────────────────────────────────────────────────

function Step4({ form, set }: { form: EventFormState; set: SetField }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-zinc-400 -mt-1">Todo lo de esta sección es opcional.</p>

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
          <Label>Contacto</Label>
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

      <div className="flex flex-col gap-1.5">
        <Label>Etiquetas</Label>
        <TagInput tags={form.tags} onChange={(tags) => set("tags", tags)} />
        <p className="text-[10px] text-zinc-400">Máximo 10 etiquetas</p>
      </div>
    </div>
  )
}

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
  const [step, setStep] = useState(1)

  function set<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < TOTAL_STEPS) {
      if (canGoNext(step, form)) setStep(step + 1)
    } else {
      void onSubmit(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StepIndicator current={step} />

      <div>
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && (
          <Step2
            form={form}
            set={set}
            province={province}
            setProvince={setProvince}
          />
        )}
        {step === 3 && <Step3 form={form} set={set} clubs={clubs} />}
        {step === 4 && <Step4 form={form} set={set} />}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
          disabled={loading}
          className="flex-1 border border-border rounded-full py-2.5 text-sm font-bold text-zinc-600 hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {step === 1 ? (
            "Cancelar"
          ) : (
            <>
              <ChevronLeft className="size-3.5" />
              Atrás
            </>
          )}
        </button>

        <button
          type="submit"
          disabled={loading || (step < TOTAL_STEPS && !canGoNext(step, form))}
          className="flex-1 bg-foreground text-white rounded-full py-2.5 text-sm font-bold hover:bg-foreground/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {step < TOTAL_STEPS ? (
            <>
              Siguiente
              <ChevronRight className="size-3.5" />
            </>
          ) : loading ? (
            mode === "create" ? "Creando…" : "Guardando…"
          ) : mode === "create" ? (
            "Crear evento"
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>
    </form>
  )
}

// ── EventFormModal ─────────────────────────────────────────────────────────────

interface EventFormModalProps extends EventFormProps {
  title: string
}

export function EventFormModal({ title, onCancel, ...formProps }: EventFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="rounded-2xl bg-card border border-border p-6 w-full max-w-2xl shadow-xl my-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black uppercase tracking-tight text-foreground">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>
        <EventForm onCancel={onCancel} {...formProps} />
      </div>
    </div>
  )
}
