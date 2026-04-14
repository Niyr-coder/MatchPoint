"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  getWeekDates,
  addWeeks,
  getCurrentWeekMonday,
  formatWeekLabel,
  isSlotOccupied,
  type WeekReservation,
} from "@/features/clubs/utils/calendar"
import type { ClubProfileCourt } from "@/features/clubs/queries/club-profile"
import { QuickBookModal, type QuickBookSlot } from "./QuickBookModal"

interface ClubWeekCalendarProps {
  clubId: string
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 07 to 22
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

interface CalendarData {
  courts: ClubProfileCourt[]
  reservations: WeekReservation[]
}

export function ClubWeekCalendar({ clubId }: ClubWeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(getCurrentWeekMonday)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<QuickBookSlot | null>(null)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6]

  useEffect(() => {
    if (!weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates[0])
    }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(() => {
    setLoading(true)
    setFetchError(null)
    fetch(`/api/clubs/${clubId}/reservations?weekStart=${weekStart}&weekEnd=${weekEnd}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data as CalendarData)
        } else {
          setFetchError("No se pudo cargar la disponibilidad.")
        }
      })
      .catch(() => setFetchError("Error de conexión. Intenta de nuevo."))
      .finally(() => setLoading(false))
  }, [clubId, weekStart, weekEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleSlotClick(court: ClubProfileCourt, date: string, hour: number) {
    const startTime = `${String(hour).padStart(2, "0")}:00`
    const endTime   = `${String(hour + 1).padStart(2, "0")}:00`
    setActiveSlot({
      courtId:      court.id,
      courtName:    court.name,
      pricePerHour: court.price_per_hour,
      date,
      startTime,
      endTime,
    })
  }

  function handleBookingSuccess() {
    setActiveSlot(null)
    fetchData()
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Disponibilidad</h2>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, -1))}
          className="p-1.5 rounded-full border border-border hover:border-foreground transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-4 text-zinc-500" />
        </button>
        <span className="text-xs font-bold text-zinc-500">{formatWeekLabel(weekStart)}</span>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="p-1.5 rounded-full border border-border hover:border-foreground transition-colors"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="size-4 text-zinc-500" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {weekDates.map((date, i) => {
          const dayNum = new Date(date + "T00:00:00").getDate()
          const isSelected = date === selectedDate
          const today = new Date().toISOString().split("T")[0]
          const isToday = date === today
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={[
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-[11px] font-bold shrink-0 transition-colors",
                isSelected
                  ? "bg-foreground text-white border-foreground"
                  : isToday
                  ? "border-foreground text-foreground"
                  : "border-border text-zinc-500 hover:border-foreground/40",
              ].join(" ")}
            >
              <span className="uppercase text-[9px] font-black tracking-wide opacity-70">{DAY_NAMES[i]}</span>
              <span>{dayNum}</span>
            </button>
          )
        })}
      </div>

      {loading && <div className="py-12 text-center text-xs text-zinc-400">Cargando disponibilidad…</div>}
      {fetchError && !loading && <div className="py-12 text-center text-xs text-red-400">{fetchError}</div>}

      {!loading && !fetchError && data && (
        data.courts.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4">Este club no tiene canchas activas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[320px]">
              <thead>
                <tr>
                  <th className="text-left py-1.5 pr-3 font-bold text-zinc-400 w-12">Hora</th>
                  {data.courts.map((court) => (
                    <th key={court.id} className="text-center py-1.5 px-1 font-bold text-foreground">
                      {court.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-t border-border/50">
                    <td className="py-1.5 pr-3 text-zinc-400 align-middle">
                      {String(hour).padStart(2, "0")}:00
                    </td>
                    {data.courts.map((court) => {
                      const occupied = isSlotOccupied(data.reservations, court.id, selectedDate, hour)
                      return (
                        <td key={court.id} className="py-0.5 px-1 text-center align-middle">
                          {occupied ? (
                            <span className="block w-full rounded-md bg-zinc-200 text-zinc-400 py-1 text-center select-none">—</span>
                          ) : (
                            <button
                              onClick={() => handleSlotClick(court, selectedDate, hour)}
                              className="w-full rounded-md bg-green-100 text-green-700 font-bold py-1 hover:bg-green-200 transition-colors"
                            >
                              Libre
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeSlot && (
        <QuickBookModal
          slot={activeSlot}
          onClose={() => setActiveSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </section>
  )
}
