"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trophy, ArrowLeft } from "lucide-react"
import Link from "next/link"

const SPORTS = [
  { value: "futbol", label: "Fútbol" },
  { value: "padel", label: "Pádel" },
  { value: "tenis", label: "Tenis" },
  { value: "pickleball", label: "Pickleball" },
] as const

export default function CreateTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const payload = {
      name: form.get("name") as string,
      sport: form.get("sport") as string,
      description: form.get("description") as string || undefined,
      max_participants: parseInt(form.get("max_participants") as string, 10),
      start_date: form.get("start_date") as string,
      end_date: form.get("end_date") as string || undefined,
      entry_fee: parseFloat(form.get("entry_fee") as string) || 0,
    }

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error ?? "Error al crear torneo")
        return
      }

      router.push(`/dashboard/tournaments/${data.data.id}`)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/tournaments"
          className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600 mb-4"
        >
          <ArrowLeft className="size-3" />
          Volver a torneos
        </Link>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#1a56db] flex items-center justify-center">
            <Trophy className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[-0.03em] text-[#0a0a0a]">
              Crear Torneo
            </h1>
            <p className="text-xs text-zinc-400">Organiza tu propia competencia</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-[#e5e5e5] p-6 flex flex-col gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Nombre del torneo *
          </label>
          <input
            name="name"
            required
            minLength={3}
            maxLength={100}
            placeholder="Copa Pádel Quito 2025"
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] placeholder:text-zinc-300 focus:outline-none focus:border-[#1a56db] transition-colors"
          />
        </div>

        {/* Sport */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Deporte *
          </label>
          <select
            name="sport"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] focus:outline-none focus:border-[#1a56db] transition-colors bg-white"
          >
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
            Descripción
          </label>
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            placeholder="Detalles del torneo, formato, premios..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm text-[#0a0a0a] placeholder:text-zinc-300 focus:outline-none focus:border-[#1a56db] transition-colors resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Fecha inicio *
            </label>
            <input
              name="start_date"
              type="date"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] focus:outline-none focus:border-[#1a56db] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Fecha fin
            </label>
            <input
              name="end_date"
              type="date"
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] focus:outline-none focus:border-[#1a56db] transition-colors"
            />
          </div>
        </div>

        {/* Participants + fee */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Máx. participantes *
            </label>
            <input
              name="max_participants"
              type="number"
              required
              min={2}
              max={256}
              defaultValue={16}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] focus:outline-none focus:border-[#1a56db] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Inscripción ($)
            </label>
            <input
              name="entry_fee"
              type="number"
              min={0}
              step={0.01}
              defaultValue={0}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] text-sm font-medium text-[#0a0a0a] placeholder:text-zinc-300 focus:outline-none focus:border-[#1a56db] transition-colors"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#1a56db] text-white text-sm font-black uppercase tracking-[0.1em] hover:bg-[#1648c0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creando..." : "Crear Torneo"}
        </button>
      </form>
    </div>
  )
}
