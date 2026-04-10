"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, UserPlus } from "lucide-react"
import type { ClubAdmin } from "@/lib/admin/queries"
import type { ApiResponse } from "@/types"

// ── constants ──────────────────────────────────────────────────────────────────

const GLOBAL_ROLE_OPTIONS = [
  { value: "user",  label: "Usuario" },
  { value: "admin", label: "Administrador" },
]

const CLUB_ROLE_OPTIONS = [
  { value: "owner",    label: "Propietario" },
  { value: "manager",  label: "Gerente" },
  { value: "partner",  label: "Socio" },
  { value: "coach",    label: "Entrenador" },
  { value: "employee", label: "Empleado" },
]

// ── types ──────────────────────────────────────────────────────────────────────

interface CreateUserPayload {
  email: string
  firstName: string
  lastName: string
  globalRole: string
  clubId?: string
  clubRole?: string
}

interface FieldError {
  email?: string
  firstName?: string
  lastName?: string
  globalRole?: string
}

export interface CreateUserModalProps {
  clubs: ClubAdmin[]
  onClose: () => void
}

// ── validation ─────────────────────────────────────────────────────────────────

function validatePayload(data: CreateUserPayload): FieldError {
  const errors: FieldError = {}

  if (!data.email.trim()) {
    errors.email = "El email es requerido"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "El email no es válido"
  }

  if (!data.firstName.trim()) {
    errors.firstName = "El nombre es requerido"
  }

  if (!data.lastName.trim()) {
    errors.lastName = "El apellido es requerido"
  }

  return errors
}

// ── field components ───────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export function CreateUserModal({ clubs, onClose }: CreateUserModalProps) {
  const router = useRouter()

  const [email, setEmail]           = useState("")
  const [firstName, setFirstName]   = useState("")
  const [lastName, setLastName]     = useState("")
  const [globalRole, setGlobalRole] = useState("user")
  const [clubId, setClubId]         = useState("")
  const [clubRole, setClubRole]     = useState("owner")

  const [fieldErrors, setFieldErrors] = useState<FieldError>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const payload: CreateUserPayload = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      globalRole,
      clubId: clubId || undefined,
      clubRole: clubId ? clubRole : undefined,
    }

    const errors = validatePayload(payload)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    setLoading(true)
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as ApiResponse<null>
      if (!json.success) {
        setSubmitError(json.error ?? "Error al crear el usuario")
        return
      }
      setSuccess(true)
      router.refresh()
      setTimeout(onClose, 1200)
    } catch {
      setSubmitError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    "w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-foreground bg-card placeholder:text-zinc-400 transition-colors disabled:opacity-50"

  const selectClass =
    "w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-foreground bg-card appearance-none cursor-pointer disabled:opacity-50"

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => { if (!loading) onClose() }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl z-50 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-foreground" />
            <p id="create-user-title" className="text-sm font-black text-foreground">
              Crear cuenta
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4"
        >
          {success && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-bold text-green-700">
              Cuenta creada exitosamente
            </div>
          )}

          {submitError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nombre" error={fieldErrors.firstName}>
              <input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setFieldErrors((p) => ({ ...p, firstName: undefined })) }}
                placeholder="Juan"
                disabled={loading || success}
                className={inputClass}
                autoComplete="given-name"
              />
            </FormField>
            <FormField label="Apellido" error={fieldErrors.lastName}>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setFieldErrors((p) => ({ ...p, lastName: undefined })) }}
                placeholder="Pérez"
                disabled={loading || success}
                className={inputClass}
                autoComplete="family-name"
              />
            </FormField>
          </div>

          <FormField label="Email" error={fieldErrors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })) }}
              placeholder="juan@ejemplo.com"
              disabled={loading || success}
              className={inputClass}
              autoComplete="email"
            />
          </FormField>

          <FormField label="Rol global" error={fieldErrors.globalRole}>
            <select
              value={globalRole}
              onChange={(e) => setGlobalRole(e.target.value)}
              disabled={loading || success}
              className={selectClass}
            >
              {GLOBAL_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>

          {/* Optional club assignment */}
          <div className="border-t border-border-subtle pt-4 flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
              Asignación a club (opcional)
            </p>

            <FormField label="Club">
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                disabled={loading || success}
                className={selectClass}
              >
                <option value="">Sin asignar a club</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </FormField>

            {clubId && (
              <FormField label="Rol en el club">
                <select
                  value={clubRole}
                  onChange={(e) => setClubRole(e.target.value)}
                  disabled={loading || success}
                  className={selectClass}
                >
                  {CLUB_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 bg-foreground text-white rounded-full py-2.5 text-sm font-bold hover:bg-foreground/90 transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? (
              <>
                <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin block shrink-0" />
                Creando cuenta…
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                Crear cuenta
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}
