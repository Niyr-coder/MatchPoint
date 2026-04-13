"use client"

import { useState } from "react"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { StepIndicator } from "./event-form/StepIndicator"
import { Step1 } from "./event-form/steps/Step1"
import { Step2, findProvinceByCity } from "./event-form/steps/Step2"
import { Step3 } from "./event-form/steps/Step3"
import { Step4 } from "./event-form/steps/Step4"
import { getStepErrors } from "./event-form/validation"
import type { EventFormState, EventFormProps } from "./event-form/types"

export type { EventFormState } from "./event-form/types"
export { EMPTY_EVENT_FORM } from "./event-form/types"

const TOTAL_STEPS = 4

export function EventForm({
  initial,
  clubs = [],
  mode,
  loading,
  error,
  onSubmit,
  onCancel,
  isAdmin,
}: EventFormProps) {
  const [form, setForm] = useState<EventFormState>(initial)
  const [province, setProvince] = useState<string>(() => findProvinceByCity(initial.city))
  const [step, setStep] = useState(1)
  const [stepErrors, setStepErrors] = useState<string[]>([])

  function set<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < TOTAL_STEPS) {
      const errors = getStepErrors(step, form, mode)
      if (errors.length > 0) {
        setStepErrors(errors)
        return
      }
      setStepErrors([])
      setStep(step + 1)
    } else {
      void onSubmit(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <StepIndicator current={step} />

      <div>
        {step === 1 && <Step1 form={form} set={set} errors={stepErrors} />}
        {step === 2 && (
          <Step2
            form={form}
            set={set}
            province={province}
            setProvince={setProvince}
            errors={stepErrors}
          />
        )}
        {step === 3 && <Step3 form={form} set={set} clubs={clubs} />}
        {step === 4 && <Step4 form={form} set={set} isAdmin={isAdmin} />}
      </div>

      {stepErrors.length > 0 && (
        <ul className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex flex-col gap-1">
          {stepErrors.map((e) => (
            <li key={e} className="text-sm text-red-600 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => { setStepErrors([]); setStep(step - 1) }}
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
          disabled={loading}
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
