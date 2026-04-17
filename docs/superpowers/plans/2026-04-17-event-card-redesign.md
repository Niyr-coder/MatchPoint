# Event Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich EventCard with 7 new contextual fields and replace the generic "Ver más" CTA with a state-aware register/inscribed button.

**Architecture:** Extract a new `EventCardCTA` client component (handles fetch + loading) so the parent `EventCard` remains a Server Component. All new fields are conditional — absent data simply isn't rendered. `is_registered` is resolved by a batched post-fetch query in `events/page.tsx`.

**Tech Stack:** React (Server + Client Components), Next.js App Router, Vitest + React Testing Library + `@testing-library/user-event`, Tailwind CSS 4

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/features/activities/components/EventCardCTA.tsx` | Create | Client component: register button with loading/error state |
| `src/features/activities/components/EventCard.tsx` | Modify | Add 7 new optional props + render new fields |
| `src/features/activities/components/EventCardSkeleton.tsx` | Modify | Match new card height |
| `src/features/activities/utils.ts` | Modify | Fix `mapEventRow` to read `is_featured` from DB row |
| `src/app/(dashboard)/dashboard/events/page.tsx` | Modify | Add `is_featured` to select, batch `is_registered` query, pass all new props |
| `src/features/activities/__tests__/EventCardCTA.test.tsx` | Create | Unit tests for CTA states and fetch behavior |
| `src/features/activities/__tests__/event-card-helpers.test.ts` | Create | Unit tests for formatting helpers |

> **Note:** `ClubEventsView` and `AdminEventsView` are table-based views — they do not render `EventCard` and need no changes.

---

### Task 1: `EventCardCTA` client component + tests

**Files:**
- Create: `src/features/activities/components/EventCardCTA.tsx`
- Create: `src/features/activities/__tests__/EventCardCTA.test.tsx`

- [ ] **Step 1: Verify `@testing-library/user-event` is installed**

```bash
cat package.json | grep user-event
```

If not found, install it:
```bash
npm install -D @testing-library/user-event
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/activities/__tests__/EventCardCTA.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { EventCardCTA } from "../components/EventCardCTA"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => { mockFetch.mockClear() })

describe("EventCardCTA", () => {
  it("shows Inscribirme when not registered and canRegister", () => {
    render(<EventCardCTA eventId="1" isRegistered={false} canRegister={true} isFull={false} />)
    expect(screen.getByRole("button", { name: /inscribirme/i })).toBeInTheDocument()
  })

  it("shows inscrito link when already registered", () => {
    render(<EventCardCTA eventId="1" isRegistered={true} canRegister={true} isFull={false} />)
    expect(screen.getByRole("link", { name: /ya estás inscrito/i })).toBeInTheDocument()
  })

  it("shows Sin lugares when isFull", () => {
    render(<EventCardCTA eventId="1" isRegistered={false} canRegister={false} isFull={true} />)
    expect(screen.getByText(/sin lugares/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /inscribirme/i })).not.toBeInTheDocument()
  })

  it("shows Registro cerrado when canRegister is false and not full", () => {
    render(<EventCardCTA eventId="1" isRegistered={false} canRegister={false} isFull={false} />)
    expect(screen.getByText(/registro cerrado/i)).toBeInTheDocument()
  })

  it("calls POST /api/events/:id/register on click", async () => {
    mockFetch.mockResolvedValueOnce({ json: async () => ({ success: true }) })
    render(<EventCardCTA eventId="evt-1" isRegistered={false} canRegister={true} isFull={false} />)
    await userEvent.click(screen.getByRole("button", { name: /inscribirme/i }))
    expect(mockFetch).toHaveBeenCalledWith("/api/events/evt-1/register", { method: "POST" })
  })

  it("shows error message on failed registration", async () => {
    mockFetch.mockResolvedValueOnce({ json: async () => ({ success: false, error: "Cupo lleno" }) })
    render(<EventCardCTA eventId="evt-1" isRegistered={false} canRegister={true} isFull={false} />)
    await userEvent.click(screen.getByRole("button", { name: /inscribirme/i }))
    expect(await screen.findByText(/cupo lleno/i)).toBeInTheDocument()
  })

  it("always renders the Info link", () => {
    render(<EventCardCTA eventId="evt-42" isRegistered={false} canRegister={true} isFull={false} />)
    expect(screen.getByRole("link", { name: /info/i })).toHaveAttribute("href", "/dashboard/events/evt-42")
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npx vitest run src/features/activities/__tests__/EventCardCTA.test.tsx
```

Expected: FAIL — `EventCardCTA` not found.

- [ ] **Step 4: Create `EventCardCTA.tsx`**

Create `src/features/activities/components/EventCardCTA.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface EventCardCTAProps {
  eventId: string
  isRegistered: boolean
  canRegister: boolean
  isFull: boolean
}

export function EventCardCTA({ eventId, isRegistered, canRegister, isFull }: EventCardCTAProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "POST" })
      const json = (await res.json()) as { success: boolean; error?: string | null }
      if (!json.success) {
        setError(json.error ?? "Error al registrarse")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex gap-2">
        {isRegistered ? (
          <Link
            href={`/dashboard/events/${eventId}`}
            className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-[#f0fdf4] text-[#15803d] border border-[#86efac]"
          >
            ✓ Ya estás inscrito
          </Link>
        ) : isFull ? (
          <span className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-muted text-zinc-400 border border-zinc-200">
            Sin lugares
          </span>
        ) : canRegister ? (
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-foreground text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Registrando…" : "Inscribirme"}
          </button>
        ) : (
          <span className="flex-1 text-center text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 bg-muted text-zinc-400 border border-zinc-200">
            Registro cerrado
          </span>
        )}

        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-[11px] font-black uppercase tracking-wide rounded-full py-2.5 px-4 bg-[#fafafa] text-zinc-500 border border-[#e5e5e5] hover:bg-muted transition-colors"
        >
          Info
        </Link>
      </div>

      {error && (
        <p className="text-[10px] text-red-600 text-center font-medium">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run src/features/activities/__tests__/EventCardCTA.test.tsx
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/activities/components/EventCardCTA.tsx src/features/activities/__tests__/EventCardCTA.test.tsx
git commit -m "feat(events): add EventCardCTA client component with register/inscribed states"
```

---

### Task 2: Helper functions + tests

**Files:**
- Modify: `src/features/activities/components/EventCard.tsx` (add exported helpers at top)
- Create: `src/features/activities/__tests__/event-card-helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/activities/__tests__/event-card-helpers.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { formatTimeRange, daysUntilDeadline, capacityColor } from "../components/EventCard"

describe("formatTimeRange", () => {
  it("returns just start time when no end_date", () => {
    expect(formatTimeRange("2026-04-19T09:00:00")).toBe("9:00")
  })

  it("returns time range with duration when end_date provided", () => {
    expect(formatTimeRange("2026-04-19T09:00:00", "2026-04-19T11:00:00")).toBe("9:00–11:00 (2h)")
  })

  it("handles fractional hours", () => {
    expect(formatTimeRange("2026-04-19T09:00:00", "2026-04-19T10:30:00")).toBe("9:00–10:30 (1.5h)")
  })

  it("returns just start time when end_date is null", () => {
    expect(formatTimeRange("2026-04-19T09:00:00", null)).toBe("9:00")
  })
})

describe("daysUntilDeadline", () => {
  it("returns negative value for past dates", () => {
    expect(daysUntilDeadline("2020-01-01T00:00:00")).toBeLessThan(0)
  })

  it("returns ~5 for a date 5 days from now", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysUntilDeadline(future)).toBe(5)
  })
})

describe("capacityColor", () => {
  it("returns black when below 75%", () => {
    expect(capacityColor(7, 10)).toBe("black")
    expect(capacityColor(0, 10)).toBe("black")
    expect(capacityColor(74, 100)).toBe("black")
  })

  it("returns amber at 75%", () => {
    expect(capacityColor(75, 100)).toBe("amber")
    expect(capacityColor(80, 100)).toBe("amber")
    expect(capacityColor(99, 100)).toBe("amber")
  })

  it("returns red at 100%", () => {
    expect(capacityColor(10, 10)).toBe("red")
    expect(capacityColor(100, 100)).toBe("red")
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/features/activities/__tests__/event-card-helpers.test.ts
```

Expected: FAIL — exports not found in EventCard.

- [ ] **Step 3: Add helper exports to the top of `EventCard.tsx`**

Add these three exported functions immediately after the imports in `src/features/activities/components/EventCard.tsx` (before the `interface EventCardProps` block):

```ts
export function formatTimeRange(startDate: string, endDate?: string | null): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("es-EC", { hour: "numeric", minute: "2-digit", hour12: false })
  const start = new Date(startDate)
  if (!endDate) return fmt(start)
  const end = new Date(endDate)
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const durationLabel = diffHours % 1 === 0 ? `${diffHours}h` : `${diffHours}h`
  return `${fmt(start)}–${fmt(end)} (${durationLabel})`
}

export function daysUntilDeadline(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function capacityColor(count: number, max: number): "black" | "amber" | "red" {
  const pct = count / max
  if (pct >= 1) return "red"
  if (pct >= 0.75) return "amber"
  return "black"
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/features/activities/__tests__/event-card-helpers.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/components/EventCard.tsx src/features/activities/__tests__/event-card-helpers.test.ts
git commit -m "feat(events): add EventCard helper functions with tests"
```

---

### Task 3: Redesign `EventCard` with all new fields

**Files:**
- Modify: `src/features/activities/components/EventCard.tsx`

- [ ] **Step 1: Replace `EventCard.tsx` with the full redesigned version**

Replace the entire content of `src/features/activities/components/EventCard.tsx` with:

```tsx
import Image from "next/image"
import { Calendar, MapPin, Users, Tag } from "lucide-react"
import { EVENT_TYPE_CONFIG, SPORT_LABELS } from "@/features/activities/constants"
import { EventCardCTA } from "@/features/activities/components/EventCardCTA"
import type { EventType, EventVisibility } from "@/features/activities/types"

// ── Helpers (exported for unit testing) ──────────────────────────────────────

export function formatTimeRange(startDate: string, endDate?: string | null): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("es-EC", { hour: "numeric", minute: "2-digit", hour12: false })
  const start = new Date(startDate)
  if (!endDate) return fmt(start)
  const end = new Date(endDate)
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const durationLabel = diffHours % 1 === 0 ? `${diffHours}h` : `${diffHours}h`
  return `${fmt(start)}–${fmt(end)} (${durationLabel})`
}

export function daysUntilDeadline(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function capacityColor(count: number, max: number): "black" | "amber" | "red" {
  const pct = count / max
  if (pct >= 1) return "red"
  if (pct >= 0.75) return "amber"
  return "black"
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.[0] ?? "").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

const VISIBILITY_CONFIG: Record<string, { label: string; className: string }> = {
  club_only:   { label: "🔒 Miembros",   className: "bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]" },
  invite_only: { label: "✉️ Invitación", className: "bg-[#fdf4ff] text-[#a21caf] border-[#f5d0fe]" },
}

const CAP_COLOR: Record<"black" | "amber" | "red", string> = {
  black: "#0a0a0a",
  amber: "#f59e0b",
  red:   "#ef4444",
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EventCardProps {
  id: string
  title: string
  description: string | null
  sport: string | null
  event_type: EventType | null
  city: string | null
  location: string | null
  start_date: string
  end_date?: string | null
  image_url: string | null
  is_free: boolean
  is_featured?: boolean
  price: number | null
  max_capacity: number | null
  registration_count: number
  club_name?: string | null
  registration_deadline?: string | null
  visibility?: EventVisibility | null
  tags?: string[] | null
  organizer_name?: string | null
  is_registered?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EventCard({
  id,
  title,
  description,
  sport,
  event_type,
  city,
  location,
  start_date,
  end_date,
  image_url,
  is_free,
  is_featured,
  price,
  max_capacity,
  registration_count,
  club_name,
  registration_deadline,
  visibility,
  tags,
  organizer_name,
  is_registered,
}: EventCardProps) {
  const typeCfg   = event_type ? EVENT_TYPE_CONFIG[event_type] : null
  const spotsLeft = max_capacity != null ? max_capacity - registration_count : null
  const isFull    = spotsLeft != null && spotsLeft <= 0

  const deadlineDays   = registration_deadline ? daysUntilDeadline(registration_deadline) : null
  const showUrgency    = deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 3
  const urgencyDate    = registration_deadline
    ? new Date(registration_deadline).toLocaleDateString("es-EC", { day: "numeric", month: "short" })
    : null
  const deadlinePassed = registration_deadline ? new Date(registration_deadline) < new Date() : false
  const canRegister    = !isFull && !deadlinePassed

  const capColor  = max_capacity != null ? capacityColor(registration_count, max_capacity) : "black"
  const capPct    = max_capacity != null ? Math.min(100, (registration_count / max_capacity) * 100) : 0
  const visConfig = visibility && visibility !== "public" ? VISIBILITY_CONFIG[visibility] : null
  const timeRange = formatTimeRange(start_date, end_date)
  const activeTags = (tags ?? []).slice(0, 3)

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col hover:border-zinc-300 transition-all group">
      {/* Cover image */}
      <div className="relative w-full h-44 shrink-0">
        {image_url ? (
          <Image
            src={image_url}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Calendar className="size-10 text-white/20" />
          </div>
        )}

        {is_featured && (
          <div className="absolute top-3 left-3">
            <span className="text-[11px] font-black px-2 py-1 rounded-full bg-[#fefce8] text-[#a16207] border border-[#fde047]">
              ★
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          {is_free ? (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] shadow-sm">
              Gratis
            </span>
          ) : price != null ? (
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-card text-foreground border border-border shadow-sm">
              ${price.toFixed(2)}
            </span>
          ) : null}
        </div>

        {isFull && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs font-black uppercase tracking-wide text-white bg-red-600 px-3 py-1 rounded-full">
              Lleno
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeCfg && (
            <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
              {typeCfg.label}
            </span>
          )}
          {sport && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-zinc-600 border border-zinc-200">
              {SPORT_LABELS[sport] ?? sport}
            </span>
          )}
          {visConfig && (
            <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${visConfig.className}`}>
              {visConfig.label}
            </span>
          )}
          {is_registered && (
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#15803d] border border-[#86efac]">
              ✓ Inscrito
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-black text-foreground leading-tight line-clamp-2">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Organizer */}
        {organizer_name && (
          <div className="flex items-center gap-1.5">
            <div className="size-[18px] rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-black text-zinc-500">{orgInitials(organizer_name)}</span>
            </div>
            <span className="text-[11px] text-zinc-400 truncate">
              {organizer_name}{club_name ? ` · ${club_name}` : ""}
            </span>
          </div>
        )}

        {/* Club name (only if no organizer) */}
        {!organizer_name && club_name && (
          <div className="flex items-center gap-1.5">
            <Tag className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500 truncate">{club_name}</span>
          </div>
        )}

        {/* Tags */}
        {activeTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {activeTags.map((tag) => (
              <span key={tag} className="text-[10px] text-zinc-400 bg-[#fafafa] border border-[#f0f0f0] rounded px-1.5 py-0.5">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Urgency banner */}
        {showUrgency && (
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="text-[11px] font-black text-[#c2410c]">
              ⏰ Cierra {deadlineDays === 0 ? "hoy" : `en ${deadlineDays} día${deadlineDays !== 1 ? "s" : ""}`}
              {urgencyDate ? ` — ${urgencyDate}` : ""}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="mt-auto pt-2.5 border-t border-[#f5f5f5] flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500 capitalize">
              {formatDate(start_date)} · {timeRange}
            </span>
          </div>
          {(location ?? city) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3 text-zinc-400 shrink-0" />
              <span className="text-[11px] text-zinc-500 truncate">
                {[location, city].filter(Boolean).join(", ")}
              </span>
            </div>
          )}
          {max_capacity != null && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3 text-zinc-400 shrink-0" />
                  <span className="text-[11px] text-zinc-500">
                    {registration_count} <span className="text-zinc-300">/ {max_capacity}</span> lugares
                  </span>
                </div>
                {capColor === "amber" && (
                  <span className="text-[10px] font-black text-[#f59e0b]">⚠ Casi lleno</span>
                )}
              </div>
              <div className="h-[4px] rounded-full bg-[#f5f5f5] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${capPct}%`, backgroundColor: CAP_COLOR[capColor] }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <EventCardCTA
          eventId={id}
          isRegistered={is_registered ?? false}
          canRegister={canRegister}
          isFull={isFull}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all activity tests to verify nothing broke**

```bash
npx vitest run src/features/activities/
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/activities/components/EventCard.tsx
git commit -m "feat(events): redesign EventCard with 7 new contextual fields and EventCardCTA"
```

---

### Task 4: Update `EventCardSkeleton`

**Files:**
- Modify: `src/features/activities/components/EventCardSkeleton.tsx`

- [ ] **Step 1: Replace skeleton to match new card structure**

Replace the full content of `src/features/activities/components/EventCardSkeleton.tsx`:

```tsx
export function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 flex flex-col gap-2.5">
        {/* badges */}
        <div className="flex gap-1.5">
          <div className="h-4 w-14 bg-muted rounded-full" />
          <div className="h-4 w-12 bg-muted rounded-full" />
        </div>
        {/* title */}
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3.5 w-full bg-muted rounded" />
        {/* organizer */}
        <div className="flex gap-1.5 items-center">
          <div className="size-[18px] rounded-full bg-muted" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
        {/* tags */}
        <div className="flex gap-1">
          <div className="h-3.5 w-16 bg-muted rounded" />
          <div className="h-3.5 w-12 bg-muted rounded" />
        </div>
        {/* meta */}
        <div className="pt-2 border-t border-border flex flex-col gap-1.5">
          <div className="h-3 w-40 bg-muted rounded" />
          <div className="h-3 w-28 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-1 w-full bg-muted rounded-full mt-0.5" />
        </div>
        {/* cta */}
        <div className="h-8 w-full bg-muted rounded-full mt-1" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/activities/components/EventCardSkeleton.tsx
git commit -m "feat(events): update EventCardSkeleton to match redesigned card height"
```

---

### Task 5: Fix `mapEventRow` + wire all props in `events/page.tsx`

**Files:**
- Modify: `src/features/activities/utils.ts`
- Modify: `src/app/(dashboard)/dashboard/events/page.tsx`

- [ ] **Step 1: Fix `mapEventRow` to read `is_featured` from DB row**

In `src/features/activities/utils.ts`, change line 33 from:

```ts
is_featured: false,
```

to:

```ts
is_featured: Boolean(row.is_featured),
```

- [ ] **Step 2: Update the `fetchEvents` function in `events/page.tsx`**

Replace the entire `fetchEvents` function (lines 25–77) in `src/app/(dashboard)/dashboard/events/page.tsx`:

```ts
async function fetchEvents(
  params: SearchParams,
  userId: string,
): Promise<{ events: EventWithClub[]; total: number }> {
  const supabase = await createClient()

  const page   = Math.max(0, parseInt(params.page ?? "0", 10))
  const tab    = params.tab ?? "all"
  const isFree = params.is_free === "true"

  let query = supabase
    .from("events")
    .select(
      `
      id, title, description, sport, event_type, status,
      club_id, city, location, start_date, end_date,
      image_url, is_free, is_featured, price, max_capacity, min_participants,
      visibility, registration_deadline, tags,
      organizer_name, organizer_contact, created_at,
      clubs ( name ),
      event_registrations ( count )
      `,
      { count: "exact" },
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .order("start_date", { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (params.sport)      query = query.eq("sport", params.sport)
  if (params.event_type) query = query.eq("event_type", params.event_type)
  if (params.city)       query = query.ilike("city", `%${params.city}%`)
  if (isFree)            query = query.eq("is_free", true)
  if (params.search)     query = query.ilike("title", `%${params.search}%`)

  let registeredIds = new Set<string>()

  if (tab === "mine") {
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("event_id")
      .eq("user_id", userId)
    const ids = (regs ?? []).map((r: { event_id: string }) => r.event_id)
    if (ids.length === 0) return { events: [], total: 0 }
    registeredIds = new Set(ids)
    query = query.in("id", ids)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)

  const eventRows: EventWithClub[] = (data ?? []).map(mapEventRow)

  if (tab !== "mine" && eventRows.length > 0) {
    const eventIds = eventRows.map((e) => e.id)
    const { data: userRegs } = await supabase
      .from("event_registrations")
      .select("event_id")
      .eq("user_id", userId)
      .in("event_id", eventIds)
    registeredIds = new Set((userRegs ?? []).map((r: { event_id: string }) => r.event_id))
  }

  const events = eventRows.map((e) => ({ ...e, is_registered: registeredIds.has(e.id) }))

  return { events, total: count ?? 0 }
}
```

- [ ] **Step 3: Pass all new props to `EventCard` in the grid section**

In `src/app/(dashboard)/dashboard/events/page.tsx`, replace the `<EventCard ... />` block inside the grid (around line 153):

```tsx
<EventCard
  key={event.id}
  id={event.id}
  title={event.title}
  description={event.description}
  sport={event.sport}
  event_type={event.event_type}
  city={event.city}
  location={event.location}
  start_date={event.start_date}
  end_date={event.end_date}
  image_url={event.image_url}
  is_free={event.is_free}
  is_featured={event.is_featured}
  price={event.price}
  max_capacity={event.max_capacity}
  registration_count={event.registration_count}
  club_name={event.club_name}
  registration_deadline={event.registration_deadline}
  visibility={event.visibility}
  tags={event.tags}
  organizer_name={event.organizer_name}
  is_registered={event.is_registered}
/>
```

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests PASS with no regressions.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/activities/utils.ts src/app/(dashboard)/dashboard/events/page.tsx
git commit -m "feat(events): wire all new EventCard props — is_featured, is_registered, deadline, visibility, tags, organizer"
```
