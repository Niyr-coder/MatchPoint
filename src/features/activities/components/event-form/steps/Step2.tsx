"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { ECUADOR_PROVINCES, ECUADOR_CITIES_BY_PROVINCE } from "@/lib/constants"
import { Label, inputCls } from "../StepIndicator"
import type { EventFormState, SetField } from "../types"

export function findProvinceByCity(city: string): string {
  if (!city) return ""
  for (const [province, cities] of Object.entries(ECUADOR_CITIES_BY_PROVINCE)) {
    if (cities.includes(city)) return province
  }
  return ""
}

export function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export function Step2({
  form,
  set,
  province,
  setProvince,
  errors = [],
}: {
  form: EventFormState
  set: SetField
  province: string
  setProvince: (p: string) => void
  errors?: string[]
}) {
  const [showEndDate, setShowEndDate] = useState(!!form.end_date)
  const cities = province ? (ECUADOR_CITIES_BY_PROVINCE[province] ?? []) : []
  const startDateInvalid = errors.some((e) => e.includes("inicio"))

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
            data-invalid={startDateInvalid}
            className={`${inputCls} data-[invalid=true]:border-red-400`}
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
