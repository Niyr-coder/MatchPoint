"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Building2, Layers, Clock, CheckCircle } from "lucide-react"
import type { ClubWithSports } from "@/lib/clubs/queries"
import type { Court } from "@/lib/courts/queries"
import type { TimeSlot } from "@/lib/courts/queries"

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardState {
  club: ClubWithSports | null
  court: Court | null
  date: string
  slot: TimeSlot | null
  notes: string
}

const INITIAL_STATE: WizardState = {
  club: null,
  court: null,
  date: "",
  slot: null,
  notes: "",
}

const SPORT_LABELS: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

// ─── Progress Indicator ──────────────────────────────────────────────────────

const STEPS = [
  { label: "Club", icon: Building2 },
  { label: "Cancha", icon: Layers },
  { label: "Horario", icon: Clock },
  { label: "Confirmar", icon: CheckCircle },
]

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep
        const Icon = step.icon

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${
                  isDone
                    ? "bg-[#0a0a0a] text-white"
                    : isActive
                    ? "bg-[#1a56db] text-white"
                    : "bg-zinc-200 text-zinc-400"
                }`}
              >
                {isDone ? (
                  <Icon className="size-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-[9px] font-black uppercase tracking-wide ${
                  isActive ? "text-[#1a56db]" : isDone ? "text-[#0a0a0a]" : "text-zinc-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-12 mx-1 mb-4 transition-colors ${
                  i < currentStep ? "bg-[#0a0a0a]" : "bg-zinc-200"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Club Selector ───────────────────────────────────────────────────

function StepClub({ onSelect }: { onSelect: (club: ClubWithSports) => void }) {
  const [clubs, setClubs] = useState<ClubWithSports[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClubs(json.data ?? [])
        else setError("No se pudieron cargar los clubes")
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 py-8 text-center">{error}</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(clubs ?? []).map((club, i) => (
        <button
          key={club.id}
          onClick={() => onSelect(club)}
          className="animate-fade-in-up rounded-2xl bg-white border border-[#e5e5e5] p-4 text-left hover:border-[#1a56db] hover:shadow-sm transition-all"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <p className="text-sm font-black text-[#0a0a0a]">{club.name}</p>
          {club.city && (
            <p className="text-[11px] text-zinc-400 mt-0.5">{club.city}</p>
          )}
          {club.sports.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {club.sports.map((s) => (
                <span
                  key={s}
                  className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border bg-zinc-50 text-zinc-500 border-zinc-200"
                >
                  {SPORT_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Step 2: Court Selector ──────────────────────────────────────────────────

function StepCourt({
  clubId,
  onSelect,
}: {
  clubId: string
  onSelect: (court: Court) => void
}) {
  const [courts, setCourts] = useState<Court[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/courts?club_id=${clubId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCourts(json.data ?? [])
        else setError("No se pudieron cargar las canchas")
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false))
  }, [clubId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 py-8 text-center">{error}</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(courts ?? []).map((court, i) => (
        <button
          key={court.id}
          onClick={() => onSelect(court)}
          className="animate-fade-in-up rounded-2xl bg-white border border-[#e5e5e5] p-4 text-left hover:border-[#1a56db] hover:shadow-sm transition-all"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-black text-[#0a0a0a]">{court.name}</p>
            <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border bg-blue-50 text-[#1a56db] border-blue-200">
              {SPORT_LABELS[court.sport] ?? court.sport}
            </span>
          </div>
          {court.surface_type && (
            <p className="text-[11px] text-zinc-400 mt-1">{court.surface_type}</p>
          )}
          <p className="text-sm font-bold text-[#0a0a0a] mt-2">
            ${court.price_per_hour.toFixed(2)}
            <span className="text-[11px] font-normal text-zinc-400">/hora</span>
          </p>
        </button>
      ))}
    </div>
  )
}

// ─── Step 3: Date + Time ─────────────────────────────────────────────────────

function StepDateTime({
  courtId,
  date,
  selectedSlot,
  onDateChange,
  onSlotSelect,
}: {
  courtId: string
  date: string
  selectedSlot: TimeSlot | null
  onDateChange: (d: string) => void
  onSlotSelect: (slot: TimeSlot) => void
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  function handleDateChange(newDate: string) {
    onDateChange(newDate)
    if (!newDate) return
    setLoadingSlots(true)
    fetch(`/api/courts/${courtId}/availability?date=${newDate}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setSlots(json.data ?? []) })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-2">
          Fecha
        </label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white"
        />
      </div>

      {date && (
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-2">
            Horario disponible
          </label>

          {loadingSlots ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="size-4 animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-400">Cargando horarios...</span>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const isSelected =
                  selectedSlot?.startTime === slot.startTime &&
                  selectedSlot?.endTime === slot.endTime

                return (
                  <button
                    key={slot.startTime}
                    disabled={!slot.available}
                    onClick={() => onSlotSelect(slot)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide transition-colors ${
                      !slot.available
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
                        : isSelected
                        ? "bg-[#1a56db] text-white border border-[#1a56db]"
                        : "bg-white text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#1a56db] hover:text-[#1a56db]"
                    }`}
                  >
                    {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Confirm ─────────────────────────────────────────────────────────

function StepConfirm({
  state,
  onNotesChange,
  onSubmit,
  submitting,
  error,
}: {
  state: WizardState
  onNotesChange: (notes: string) => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-zinc-50 border border-[#e5e5e5] p-5 flex flex-col gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Resumen de la reserva
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <span className="text-zinc-400">Club</span>
          <span className="font-bold text-[#0a0a0a]">{state.club?.name}</span>
          <span className="text-zinc-400">Cancha</span>
          <span className="font-bold text-[#0a0a0a]">{state.court?.name}</span>
          <span className="text-zinc-400">Deporte</span>
          <span className="font-bold text-[#0a0a0a]">
            {state.court ? (SPORT_LABELS[state.court.sport] ?? state.court.sport) : "—"}
          </span>
          <span className="text-zinc-400">Fecha</span>
          <span className="font-bold text-[#0a0a0a]">
            {state.date
              ? new Date(state.date + "T12:00:00").toLocaleDateString("es-EC", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : "—"}
          </span>
          <span className="text-zinc-400">Horario</span>
          <span className="font-bold text-[#0a0a0a]">
            {state.slot
              ? `${state.slot.startTime.slice(0, 5)} – ${state.slot.endTime.slice(0, 5)}`
              : "—"}
          </span>
          <span className="text-zinc-400">Precio</span>
          <span className="font-bold text-[#0a0a0a]">
            ${state.court?.price_per_hour.toFixed(2)}
          </span>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 block mb-2">
          Notas (opcional)
        </label>
        <textarea
          value={state.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Indicaciones especiales, número de jugadores, etc."
          className="w-full border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8 bg-white resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="bg-[#1a56db] hover:bg-[#1648c0] text-white rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {submitting && <Loader2 className="size-3.5 animate-spin" />}
        Confirmar reserva
      </button>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export function ReservationWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleSelectClub(club: ClubWithSports) {
    setWizardState({ ...INITIAL_STATE, club })
    setStep(1)
  }

  function handleSelectCourt(court: Court) {
    setWizardState((prev) => ({ ...prev, court, date: "", slot: null }))
    setStep(2)
  }

  function handleDateChange(date: string) {
    setWizardState((prev) => ({ ...prev, date, slot: null }))
  }

  function handleSlotSelect(slot: TimeSlot) {
    setWizardState((prev) => ({ ...prev, slot }))
    setStep(3)
  }

  function handleNotesChange(notes: string) {
    setWizardState((prev) => ({ ...prev, notes }))
  }

  async function handleSubmit() {
    const { court, date, slot, notes } = wizardState
    if (!court || !date || !slot) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          court_id: court.id,
          date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          total_price: court.price_per_hour,
          notes: notes.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Error al crear la reserva")
        return
      }

      router.refresh()
      router.push("/dashboard/reservations")
    } catch {
      setSubmitError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  const canGoBack = step > 0 && !submitting

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Progress */}
      <ProgressIndicator currentStep={step} />

      {/* Step content */}
      <div key={step} className="animate-fade-in">
        {step === 0 && <StepClub onSelect={handleSelectClub} />}

        {step === 1 && wizardState.club && (
          <StepCourt
            clubId={wizardState.club.id}
            onSelect={handleSelectCourt}
          />
        )}

        {step === 2 && wizardState.court && (
          <StepDateTime
            courtId={wizardState.court.id}
            date={wizardState.date}
            selectedSlot={wizardState.slot}
            onDateChange={handleDateChange}
            onSlotSelect={handleSlotSelect}
          />
        )}

        {step === 3 && (
          <StepConfirm
            state={wizardState}
            onNotesChange={handleNotesChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={submitError}
          />
        )}
      </div>

      {/* Back nav */}
      {canGoBack && (
        <button
          onClick={() => setStep((s) => s - 1)}
          className="self-start text-[11px] font-black uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← Volver
        </button>
      )}
    </div>
  )
}
