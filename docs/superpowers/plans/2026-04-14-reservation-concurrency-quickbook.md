# Reservation Concurrency & Quick Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent double-bookings via an atomic PostgreSQL RPC, and replace the full-wizard navigation with an inline Quick Book modal on the club calendar.

**Architecture:** A new `reserve_slot` PostgreSQL function uses `pg_advisory_xact_lock` to serialize concurrent reservations for the same court+date, then checks for time-range overlap before inserting — all in one transaction. The existing `POST /api/reservations` route calls this RPC instead of doing a plain insert. The `ClubWeekCalendar` component gains a `QuickBookModal` that opens on slot click instead of navigating away.

**Tech Stack:** PostgreSQL (RPC, advisory locks), Supabase JS client (`.rpc()`), Next.js App Router API routes, React (useState/useTransition), Tailwind CSS 4, Zod (already in use), Vitest (unit tests)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/052_reserve_slot_atomic.sql` | `reserve_slot` RPC + performance index |
| Modify | `src/features/bookings/queries.ts` | Call `.rpc('reserve_slot', ...)` instead of plain insert |
| Modify | `src/app/api/reservations/route.ts` | Handle `slot_conflict` → 409 response |
| Create | `src/features/clubs/components/QuickBookModal.tsx` | Inline confirm modal (court, date, time, price, notes) |
| Modify | `src/features/clubs/components/ClubWeekCalendar.tsx` | Open modal on slot click; refresh on success |
| Modify | `src/features/bookings/queries.ts` tests | `src/features/bookings/__tests__/queries.test.ts` |

---

## Task 1: Migration — `reserve_slot` atomic RPC

**Files:**
- Create: `supabase/migrations/052_reserve_slot_atomic.sql`

### What this does
Creates a PostgreSQL function that:
1. Acquires an advisory transaction lock keyed on `(court_id, date)` — serializes all concurrent calls for the same court+date.
2. Checks for time-range overlap with active reservations.
3. Inserts and returns the new reservation if no conflict.
4. Raises `slot_conflict` (SQLSTATE P0001) if overlap found.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/052_reserve_slot_atomic.sql

-- ── Performance index for overlap queries ───────────────────────────
CREATE INDEX IF NOT EXISTS reservations_court_date_active_idx
  ON public.reservations(court_id, date, start_time, end_time)
  WHERE status != 'cancelled';

-- ── Atomic slot reservation function ────────────────────────────────
CREATE OR REPLACE FUNCTION public.reserve_slot(
  p_court_id    UUID,
  p_user_id     UUID,
  p_date        DATE,
  p_start_time  TIME,
  p_end_time    TIME,
  p_total_price NUMERIC,
  p_notes       TEXT DEFAULT NULL
)
RETURNS SETOF public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Serialize concurrent reservations for this court+date.
  -- hashtext() returns int4; pg_advisory_xact_lock(int4, int4) is valid.
  -- Lock is released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_court_id::text),
    hashtext(p_date::text)
  );

  -- Check for time-range overlap with active reservations.
  -- Two ranges [a,b) and [c,d) overlap when a < d AND b > c.
  IF EXISTS (
    SELECT 1
    FROM   public.reservations
    WHERE  court_id   = p_court_id
      AND  date       = p_date
      AND  status    != 'cancelled'
      AND  start_time < p_end_time
      AND  end_time   > p_start_time
  ) THEN
    RAISE EXCEPTION 'slot_conflict'
      USING ERRCODE = 'P0001',
            DETAIL  = 'The requested time slot overlaps an existing reservation.';
  END IF;

  -- Insert and return the new reservation.
  RETURN QUERY
  INSERT INTO public.reservations
    (court_id, user_id, date, start_time, end_time, total_price, notes)
  VALUES
    (p_court_id, p_user_id, p_date, p_start_time, p_end_time, p_total_price, p_notes)
  RETURNING *;
END;
$$;

-- Grant execute to authenticated users (RLS on the table still applies).
GRANT EXECUTE ON FUNCTION public.reserve_slot(UUID, UUID, DATE, TIME, TIME, NUMERIC, TEXT)
  TO authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
supabase db push
```

Expected output: migration `052_reserve_slot_atomic` applied, no errors.

- [ ] **Step 3: Smoke-test the function in Supabase Studio SQL editor**

Run (replace UUIDs with real values from your DB):
```sql
SELECT * FROM reserve_slot(
  '<court_id_uuid>',
  '<user_id_uuid>',
  '2026-05-01',
  '10:00',
  '11:00',
  12.00,
  NULL
);
```
Expected: returns 1 row (the new reservation).

Run again immediately with the same args:
Expected: ERROR `slot_conflict`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/052_reserve_slot_atomic.sql
git commit -m "feat(db): atomic reserve_slot RPC with advisory lock and overlap check"
```

---

## Task 2: Update `createReservation` to call the RPC

**Files:**
- Modify: `src/features/bookings/queries.ts` (lines 56–70)

The current `createReservation` does a plain `.insert()`. Replace it with `.rpc('reserve_slot', ...)`. The function signature and return type stay the same for callers.

- [ ] **Step 1: Write the failing test**

Create `src/features/bookings/__tests__/queries.test.ts`:

```typescript
// src/features/bookings/__tests__/queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Supabase client
const mockRpc = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mockRpc,
  }),
}))

import { createReservation } from "../queries"

describe("createReservation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls reserve_slot RPC with correct params", async () => {
    const fakeReservation = {
      id: "res-1",
      court_id: "court-1",
      user_id: "user-1",
      date: "2026-05-01",
      start_time: "10:00:00",
      end_time: "11:00:00",
      total_price: 12,
      notes: null,
      status: "pending",
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    }
    mockRpc.mockResolvedValue({ data: [fakeReservation], error: null })

    const result = await createReservation("user-1", {
      court_id: "court-1",
      date: "2026-05-01",
      start_time: "10:00",
      end_time: "11:00",
      total_price: 12,
    })

    expect(mockRpc).toHaveBeenCalledWith("reserve_slot", {
      p_court_id:    "court-1",
      p_user_id:     "user-1",
      p_date:        "2026-05-01",
      p_start_time:  "10:00",
      p_end_time:    "11:00",
      p_total_price: 12,
      p_notes:       undefined,
    })
    expect(result.id).toBe("res-1")
  })

  it("throws with 'slot_conflict' message when RPC returns slot_conflict error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "slot_conflict", code: "P0001" },
    })

    await expect(
      createReservation("user-1", {
        court_id: "court-1",
        date: "2026-05-01",
        start_time: "10:00",
        end_time: "11:00",
        total_price: 12,
      })
    ).rejects.toThrow("slot_conflict")
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/features/bookings/__tests__/queries.test.ts
```

Expected: FAIL — `createReservation` still uses `.insert()`, not `.rpc()`.

- [ ] **Step 3: Replace `createReservation` in `queries.ts`**

In `src/features/bookings/queries.ts`, replace lines 56–70:

```typescript
export async function createReservation(
  userId: string,
  input: CreateReservationInput
): Promise<Reservation> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("reserve_slot", {
    p_court_id:    input.court_id,
    p_user_id:     userId,
    p_date:        input.date,
    p_start_time:  input.start_time,
    p_end_time:    input.end_time,
    p_total_price: input.total_price,
    p_notes:       input.notes,
  })

  if (error) throw new Error(error.message)

  // reserve_slot returns SETOF reservations — Supabase wraps it as an array
  const reservation = Array.isArray(data) ? data[0] : data
  if (!reservation) throw new Error("No reservation returned")

  return reservation as Reservation
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/features/bookings/__tests__/queries.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/bookings/queries.ts src/features/bookings/__tests__/queries.test.ts
git commit -m "feat(bookings): createReservation uses atomic reserve_slot RPC"
```

---

## Task 3: Handle `slot_conflict` in the API route

**Files:**
- Modify: `src/app/api/reservations/route.ts` (POST handler, lines 73–98)

When the RPC raises `slot_conflict`, the error propagates as `error.message === "slot_conflict"`. Return 409 with a human-readable message instead of 500.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/reservations/__tests__/route.test.ts`:

```typescript
// src/app/api/reservations/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { price_per_hour: 12 },
        error: null,
      }),
    }),
  }),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { reservations: {} },
}))

vi.mock("@/features/bookings/queries", () => ({
  createReservation: vi.fn(),
  getUserReservations: vi.fn().mockResolvedValue([]),
  cancelReservation: vi.fn(),
}))

import { POST } from "../route"
import { createReservation } from "@/features/bookings/queries"

const validBody = {
  court_id: "00000000-0000-0000-0000-000000000001",
  date: "2026-05-01",
  start_time: "10:00",
  end_time: "11:00",
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/reservations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 409 with user-friendly message on slot_conflict", async () => {
    vi.mocked(createReservation).mockRejectedValue(new Error("slot_conflict"))

    const res = await POST(makeRequest(validBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Este horario ya fue reservado. Elige otro.")
  })

  it("returns 500 on unexpected errors", async () => {
    vi.mocked(createReservation).mockRejectedValue(new Error("DB connection failed"))

    const res = await POST(makeRequest(validBody))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/app/api/reservations/__tests__/route.test.ts
```

Expected: FAIL — slot_conflict currently returns 500, not 409.

- [ ] **Step 3: Update the POST catch block in `route.ts`**

In `src/app/api/reservations/route.ts`, replace the catch block inside the POST handler (currently at the end of the `try`):

```typescript
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear reserva"

    if (message === "slot_conflict") {
      return NextResponse.json(
        { success: false, error: "Este horario ya fue reservado. Elige otro." },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/app/api/reservations/__tests__/route.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/reservations/route.ts src/app/api/reservations/__tests__/route.test.ts
git commit -m "feat(api): return 409 on slot_conflict reservation error"
```

---

## Task 4: `QuickBookModal` component

**Files:**
- Create: `src/features/clubs/components/QuickBookModal.tsx`

A self-contained modal that receives all slot data as props. Calls `POST /api/reservations` directly. Reports success/error inline. No routing.

- [ ] **Step 1: Create the component**

```typescript
// src/features/clubs/components/QuickBookModal.tsx
"use client"

import { useState, useTransition } from "react"
import { X, Loader2 } from "lucide-react"

export interface QuickBookSlot {
  courtId: string
  courtName: string
  pricePerHour: number
  date: string        // "YYYY-MM-DD"
  startTime: string   // "HH:00"
  endTime: string     // "HH:00"
}

interface QuickBookModalProps {
  slot: QuickBookSlot
  onClose: () => void
  onSuccess: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function QuickBookModal({ slot, onClose, onSuccess }: QuickBookModalProps) {
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            court_id:   slot.courtId,
            date:       slot.date,
            start_time: slot.startTime,
            end_time:   slot.endTime,
            notes:      notes.trim() || undefined,
          }),
        })

        const json = await res.json()

        if (!res.ok || !json.success) {
          setError(json.error ?? "Error al reservar. Intenta de nuevo.")
          return
        }

        onSuccess()
      } catch {
        setError("Error de conexión. Intenta de nuevo.")
      }
    })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel */}
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl flex flex-col gap-5 p-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Reserva rápida
            </p>
            <h2 className="text-base font-black text-foreground mt-0.5">
              {slot.courtName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="size-4 text-zinc-500" />
          </button>
        </div>

        {/* Slot summary */}
        <div className="rounded-xl bg-secondary border border-border p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-zinc-400">Fecha</span>
          <span className="font-bold text-foreground capitalize">{formatDate(slot.date)}</span>
          <span className="text-zinc-400">Horario</span>
          <span className="font-bold text-foreground">
            {slot.startTime} – {slot.endTime}
          </span>
          <span className="text-zinc-400">Precio</span>
          <span className="font-bold text-foreground">${slot.pricePerHour.toFixed(2)}</span>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Indicaciones especiales, número de jugadores…"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-400 outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 bg-card resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-zinc-500 hover:border-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-full bg-foreground text-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isPending && <Loader2 className="size-3 animate-spin" />}
            {isPending ? "Reservando…" : "Confirmar →"}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/QuickBookModal.tsx
git commit -m "feat(ui): QuickBookModal component for inline reservation from calendar"
```

---

## Task 5: Wire `QuickBookModal` into `ClubWeekCalendar`

**Files:**
- Modify: `src/features/clubs/components/ClubWeekCalendar.tsx`

Replace `handleSlotClick`'s `router.push(...)` with state that opens the modal. On success: close modal and re-fetch calendar data so the slot turns occupied immediately.

- [ ] **Step 1: Update `ClubWeekCalendar.tsx`**

Replace the full file content with:

```typescript
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

  // Keep selectedDate within displayed week
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
    fetchData() // refresh so the slot turns occupied
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">Disponibilidad</h2>

      {/* Week navigation */}
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

      {/* Day selector */}
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

      {/* States */}
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

      {/* Quick Book Modal */}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Manual smoke test**

1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/clubs/[any-slug]`
3. Click a "Libre" slot in the calendar
4. Verify modal opens with correct court name, date, time, price
5. Click outside the modal → verify it closes
6. Click "Cancelar" → verify it closes
7. Click "Confirmar →" → verify slot turns `—` (occupied) after success
8. Click same slot again → verify it shows `—` (not clickable)

- [ ] **Step 5: Commit**

```bash
git add src/features/clubs/components/ClubWeekCalendar.tsx
git commit -m "feat(ui): open QuickBookModal on calendar slot click, refresh on success"
```

---

## Task 6: Push to remote

- [ ] **Step 1: Final type check and test run**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: no type errors, all tests pass.

- [ ] **Step 2: Push**

```bash
git push
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| Prevent double bookings | Task 1 (advisory lock + overlap check in DB) |
| Race condition on concurrent inserts | Task 1 (`pg_advisory_xact_lock`) |
| API handles conflict gracefully | Task 3 (409 + user-friendly message) |
| Quick booking from calendar grid | Task 4 + Task 5 |
| Calendar refreshes after booking | Task 5 (`handleBookingSuccess` calls `fetchData`) |
| Notes field | Task 4 (QuickBookModal textarea) |
| Show price before confirming | Task 4 (slot summary grid) |

### Placeholder scan
No TBDs, no "similar to task N", all code blocks complete.

### Type consistency
- `QuickBookSlot` defined in Task 4, imported in Task 5 ✓
- `ClubProfileCourt` (existing type with `id`, `name`, `price_per_hour`, `sport`) used correctly ✓
- `handleSlotClick` signature changed from `(courtId, date, hour)` to `(court, date, hour)` consistently in Task 5 ✓
- `fetchData` extracted to `useCallback` and reused in `useEffect` and `handleBookingSuccess` ✓
