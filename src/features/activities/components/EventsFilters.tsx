"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Search, X } from "lucide-react"
import { SPORTS, EVENT_TYPES } from "@/features/activities/constants"

export function EventsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sport     = searchParams.get("sport")     ?? ""
  const eventType = searchParams.get("event_type") ?? ""
  const city      = searchParams.get("city")      ?? ""
  const isFree    = searchParams.get("is_free")   ?? ""
  const search    = searchParams.get("search")    ?? ""

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const hasFilters = sport || eventType || city || isFree || search

  function clearAll() {
    router.push(pathname)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => updateParam("search", e.target.value)}
          placeholder="Buscar eventos…"
          className="w-full border border-[#e5e5e5] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#0a0a0a] placeholder:text-zinc-400 outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/8"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={sport}
          onChange={(e) => updateParam("sport", e.target.value)}
          className="border border-[#e5e5e5] rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 outline-none focus:border-[#0a0a0a] bg-white"
        >
          <option value="">Todos los deportes</option>
          {SPORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={eventType}
          onChange={(e) => updateParam("event_type", e.target.value)}
          className="border border-[#e5e5e5] rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 outline-none focus:border-[#0a0a0a] bg-white"
        >
          <option value="">Todos los tipos</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <input
          type="text"
          value={city}
          onChange={(e) => updateParam("city", e.target.value)}
          placeholder="Ciudad…"
          className="border border-[#e5e5e5] rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 outline-none focus:border-[#0a0a0a] placeholder:text-zinc-400 bg-white"
        />

        <label className="flex items-center gap-1.5 border border-[#e5e5e5] rounded-full px-3 py-1.5 cursor-pointer hover:bg-zinc-50 transition-colors">
          <input
            type="checkbox"
            checked={isFree === "true"}
            onChange={(e) => updateParam("is_free", e.target.checked ? "true" : "")}
            className="size-3 accent-[#0a0a0a]"
          />
          <span className="text-xs font-bold text-zinc-600">Solo gratuitos</span>
        </label>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="size-3" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
