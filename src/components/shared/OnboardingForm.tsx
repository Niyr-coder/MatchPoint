"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { onboardingSchema } from "@/lib/validations"
import { ECUADOR_CITIES_BY_PROVINCE, ECUADOR_PROVINCES } from "@/lib/constants"

type Status = "idle" | "loading" | "success" | "error"
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid"

interface FieldErrors {
  username?: string
  first_name?: string
  last_name?: string
  province?: string
  city?: string
  phone?: string
  date_of_birth?: string
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i)

export function OnboardingForm() {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>("idle")
  const [globalError, setGlobalError] = useState("")

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (username.length < 3) {
      setUsernameStatus("idle")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus("invalid")
      return
    }

    setUsernameStatus("checking")
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile/check-username?username=${encodeURIComponent(username)}`)
        const data = await res.json()
        setUsernameStatus(data.data?.available ? "available" : "taken")
      } catch {
        setUsernameStatus("idle")
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username])

  const availableCities = province ? (ECUADOR_CITIES_BY_PROVINCE[province] ?? []) : []

  const handleProvinceChange = (value: string) => {
    setProvince(value)
    setCity("") // reset city when province changes
    setFieldErrors((prev) => ({ ...prev, province: undefined, city: undefined }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-numeric characters on input
    setPhone(e.target.value.replace(/\D/g, ""))
  }

  const buildDob = (): string => {
    if (!dobYear || !dobMonth || !dobDay) return ""
    const month = String(MONTHS.indexOf(dobMonth) + 1).padStart(2, "0")
    const day = String(Number(dobDay)).padStart(2, "0")
    return `${dobYear}-${month}-${day}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setGlobalError("")

    const payload = {
      username,
      first_name: firstName,
      last_name: lastName,
      province,
      city,
      phone,
      date_of_birth: buildDob(),
    }

    const parsed = onboardingSchema.safeParse(payload)
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setGlobalError(data.error ?? "Error al guardar. Intenta de nuevo.")
        setStatus("error")
        return
      }

      setStatus("success")
      router.push("/dashboard")
    } catch {
      setGlobalError("Error de conexión. Intenta de nuevo.")
      setStatus("error")
    }
  }

  const inputClass = (hasError?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm text-[#0a0a0a] placeholder:text-[#c0c0c0] outline-none transition-all bg-white ${
      hasError
        ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
        : "border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
    }`

  const selectClass = (hasError?: string, disabled?: boolean) =>
    `w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all bg-white appearance-none ${
      disabled
        ? "border-[#e5e5e5] text-[#c0c0c0] cursor-not-allowed"
        : hasError
        ? "border-red-400 text-[#0a0a0a] focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
        : "border-[#e5e5e5] text-[#0a0a0a] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
    }`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
          Nombre de usuario
        </label>
        <div className="relative">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              setFieldErrors((prev) => ({ ...prev, username: undefined }))
            }}
            placeholder="juanperez_99"
            maxLength={30}
            autoComplete="username"
            className={inputClass(fieldErrors.username) + " pr-10"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && <Loader2 className="size-4 text-zinc-400 animate-spin" />}
            {usernameStatus === "available" && <CheckCircle className="size-4 text-[#16a34a]" />}
            {usernameStatus === "taken" && <XCircle className="size-4 text-red-500" />}
          </span>
        </div>
        {usernameStatus === "available" && (
          <p className="text-xs text-[#16a34a] mt-1.5">@{username} está disponible</p>
        )}
        {usernameStatus === "taken" && (
          <p className="text-xs text-red-500 mt-1.5">@{username} ya está en uso</p>
        )}
        {usernameStatus === "invalid" && (
          <p className="text-xs text-red-500 mt-1.5">Solo letras, números y guión bajo</p>
        )}
        {fieldErrors.username && (
          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.username}</p>
        )}
        <p className="text-[11px] text-zinc-400 mt-1">Mínimo 3 caracteres · Solo letras, números y _</p>
      </div>

      {/* Nombre + Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="first_name" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
            Nombre
          </label>
          <input
            id="first_name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Juan"
            autoComplete="given-name"
            className={inputClass(fieldErrors.first_name)}
          />
          {fieldErrors.first_name && (
            <p className="text-xs text-red-500 mt-1.5">{fieldErrors.first_name}</p>
          )}
        </div>
        <div>
          <label htmlFor="last_name" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
            Apellido
          </label>
          <input
            id="last_name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Pérez"
            autoComplete="family-name"
            className={inputClass(fieldErrors.last_name)}
          />
          {fieldErrors.last_name && (
            <p className="text-xs text-red-500 mt-1.5">{fieldErrors.last_name}</p>
          )}
        </div>
      </div>

      {/* Provincia */}
      <div>
        <label htmlFor="province" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
          Provincia
        </label>
        <select
          id="province"
          value={province}
          onChange={(e) => handleProvinceChange(e.target.value)}
          className={selectClass(fieldErrors.province)}
        >
          <option value="" disabled>Selecciona tu provincia</option>
          {ECUADOR_PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {fieldErrors.province && (
          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.province}</p>
        )}
      </div>

      {/* Ciudad — se desbloquea al elegir provincia */}
      <div>
        <label
          htmlFor="city"
          className={`block text-xs font-semibold mb-1.5 ${province ? "text-[#0a0a0a]" : "text-[#c0c0c0]"}`}
        >
          Ciudad
          {!province && <span className="font-normal ml-1">(selecciona una provincia primero)</span>}
        </label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!province}
          className={selectClass(fieldErrors.city, !province)}
        >
          <option value="" disabled>
            {province ? "Selecciona tu ciudad" : "— Primero elige una provincia —"}
          </option>
          {availableCities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {fieldErrors.city && (
          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.city}</p>
        )}
      </div>

      {/* Teléfono — solo números */}
      <div>
        <label htmlFor="phone" className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
          Teléfono de contacto
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="0991234567"
          maxLength={15}
          className={inputClass(fieldErrors.phone)}
        />
        {fieldErrors.phone && (
          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.phone}</p>
        )}
      </div>

      {/* Fecha de nacimiento */}
      <div>
        <span className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
          Fecha de nacimiento
        </span>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="Día"
            value={dobDay}
            onChange={(e) => setDobDay(e.target.value)}
            className={selectClass(fieldErrors.date_of_birth)}
          >
            <option value="" disabled>Día</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Mes"
            value={dobMonth}
            onChange={(e) => setDobMonth(e.target.value)}
            className={selectClass(fieldErrors.date_of_birth)}
          >
            <option value="" disabled>Mes</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Año"
            value={dobYear}
            onChange={(e) => setDobYear(e.target.value)}
            className={selectClass(fieldErrors.date_of_birth)}
          >
            <option value="" disabled>Año</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {fieldErrors.date_of_birth && (
          <p className="text-xs text-red-500 mt-1.5">{fieldErrors.date_of_birth}</p>
        )}
      </div>

      {/* Global error */}
      {globalError && (
        <p className="text-xs text-red-500 text-center">{globalError}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-pill bg-[#16a34a] text-white w-full py-3.5 text-sm mt-2 disabled:opacity-50"
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Guardar y continuar"
        )}
      </button>
    </form>
  )
}
