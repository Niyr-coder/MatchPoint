import type { EventFormState } from "./types"

export function getStepErrors(step: number, form: EventFormState, mode: "create" | "edit"): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (form.title.trim().length < 3) errors.push("El nombre debe tener al menos 3 caracteres")
  }
  if (step === 2) {
    if (!form.start_date) {
      errors.push("La fecha de inicio es requerida")
    } else {
      if (mode === "create") {
        const today = new Date().toISOString().split("T")[0]
        if (form.start_date < today) errors.push("La fecha de inicio debe ser hoy o en el futuro")
      }
      if (form.end_date && form.end_date < form.start_date) {
        errors.push("La fecha de fin debe ser posterior a la de inicio")
      }
      if (form.registration_deadline && form.registration_deadline >= form.start_date) {
        errors.push("El límite de registro debe ser anterior a la fecha de inicio")
      }
    }
  }
  if (step === 3) {
    if (!form.is_free && (!form.price || parseFloat(form.price) <= 0)) {
      errors.push("El precio es requerido para eventos de pago")
    }
    if (form.max_capacity && parseInt(form.max_capacity) <= 0) {
      errors.push("La capacidad máxima debe ser mayor a 0")
    }
  }
  return errors
}

export function canGoNext(step: number, form: EventFormState, mode: "create" | "edit"): boolean {
  return getStepErrors(step, form, mode).length === 0
}
