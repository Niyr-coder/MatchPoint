# Player Club Profile Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clickable club profile page at `/dashboard/clubs/[slug]` where any player can see club info, courts, active tournaments, a weekly reservation calendar, and join the club as a member.

**Architecture:** Single scrollable Server Component page that loads all data in parallel. The weekly calendar is a Client Component that fetches reservation data. Joining a club is a Server Action that inserts into `club_members`.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase (PostgreSQL) · Tailwind CSS 4 · Vitest · Lucide icons

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/features/clubs/utils/calendar.ts` | Pure date/slot utilities for the calendar |
| Create | `src/features/clubs/__tests__/calendar.test.ts` | Unit tests for calendar utilities |
| Create | `src/features/clubs/queries/club-profile.ts` | DB queries: getClubBySlug, getClubCourts, getClubActiveTournaments, isClubMember |
| Create | `src/app/api/clubs/[clubId]/reservations/route.ts` | GET reservations for a week (public) |
| Create | `src/features/clubs/actions/join-club.ts` | Server Action: insert into club_members |
| Modify | `src/features/clubs/components/ClubCard.tsx` | Wrap card in Link to club profile |
| Create | `src/features/clubs/components/JoinClubButton.tsx` | Client Component for join interaction |
| Create | `src/features/clubs/components/ClubProfileHero.tsx` | Cover, logo, info, join button |
| Create | `src/features/clubs/components/ClubCourtsSection.tsx` | Court cards (number + price/hr) |
| Create | `src/features/clubs/components/ClubTournamentsSection.tsx` | Active tournaments list |
| Create | `src/features/clubs/components/ClubWeekCalendar.tsx` | Client: week nav + day grid |
| Create | `src/features/clubs/components/ClubMemberSections.tsx` | Chat, shop, my reservations (member-only) |
| Create | `src/features/clubs/components/ClubProfileShell.tsx` | Orchestrates all sections |
| Create | `src/app/(dashboard)/dashboard/clubs/[slug]/page.tsx` | Server Component page entry point |

---

## Task 1: Calendar utility functions + tests

**Files:**
- Create: `src/features/clubs/utils/calendar.ts`
- Create: `src/features/clubs/__tests__/calendar.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/clubs/__tests__/calendar.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  getWeekDates,
  addWeeks,
  getCurrentWeekMonday,
  isSlotOccupied,
  formatWeekLabel,
} from "../utils/calendar"

describe("getWeekDates", () => {
  it("returns 7 consecutive dates starting from the given Monday", () => {
    const dates = getWeekDates("2026-04-13")
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe("2026-04-13")
    expect(dates[6]).toBe("2026-04-19")
  })

  it("each element is a valid YYYY-MM-DD string", () => {
    const dates = getWeekDates("2026-04-13")
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe("addWeeks", () => {
  it("advances by 7 days", () => {
    expect(addWeeks("2026-04-13", 1)).toBe("2026-04-20")
  })

  it("goes back by 7 days with delta -1", () => {
    expect(addWeeks("2026-04-20", -1)).toBe("2026-04-13")
  })
})

describe("getCurrentWeekMonday", () => {
  it("returns a Monday (day index 1) in YYYY-MM-DD format", () => {
    const monday = getCurrentWeekMonday()
    expect(monday).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const d = new Date(monday + "T00:00:00")
    expect(d.getDay()).toBe(1)
  })
})

describe("formatWeekLabel", () => {
  it("returns a readable range string", () => {
    const label = formatWeekLabel("2026-04-13")
    expect(label).toBe("13 – 19 abr 2026")
  })
})

describe("isSlotOccupied", () => {
  const reservations = [
    { court_id: "c1", date: "2026-04-13", start_time: "10:00", end_time: "12:00" },
  ]

  it("returns true when slot is fully inside the reservation", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 11)).toBe(true)
  })

  it("returns true when slot starts at reservation start", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 10)).toBe(true)
  })

  it("returns false when slot is immediately after the reservation ends", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 12)).toBe(false)
  })

  it("returns false when slot is before the reservation", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-13", 9)).toBe(false)
  })

  it("returns false for a different court", () => {
    expect(isSlotOccupied(reservations, "c2", "2026-04-13", 10)).toBe(false)
  })

  it("returns false for a different date", () => {
    expect(isSlotOccupied(reservations, "c1", "2026-04-14", 10)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
npx vitest run src/features/clubs/__tests__/calendar.test.ts
```

Expected: FAIL with "Cannot find module '../utils/calendar'"

- [ ] **Step 3: Create the utility file**

Create `src/features/clubs/utils/calendar.ts`:

```typescript
export interface WeekReservation {
  court_id: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
}

/** Returns 7 YYYY-MM-DD strings starting at weekStart (expected: a Monday). */
export function getWeekDates(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00")
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().split("T")[0]
  })
}

/** Advances or retreats weekStart by delta weeks. Returns a YYYY-MM-DD string. */
export function addWeeks(weekStart: string, delta: number): string {
  const d = new Date(weekStart + "T00:00:00")
  d.setDate(d.getDate() + delta * 7)
  return d.toISOString().split("T")[0]
}

/** Returns the Monday of the current week in YYYY-MM-DD. */
export function getCurrentWeekMonday(): string {
  const today = new Date()
  const dayIndex = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const offsetToMonday = dayIndex === 0 ? -6 : 1 - dayIndex
  const monday = new Date(today)
  monday.setDate(today.getDate() + offsetToMonday)
  return monday.toISOString().split("T")[0]
}

const MONTH_NAMES_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
]

/** Returns e.g. "13 – 19 abr 2026" */
export function formatWeekLabel(weekStart: string): string {
  const dates = getWeekDates(weekStart)
  const start = new Date(dates[0] + "T00:00:00")
  const end = new Date(dates[6] + "T00:00:00")
  const month = MONTH_NAMES_ES[end.getMonth()]
  return `${start.getDate()} – ${end.getDate()} ${month} ${end.getFullYear()}`
}

/**
 * Returns true if the 1-hour slot starting at `hour:00` on `date` for `courtId`
 * overlaps with any reservation in `reservations`.
 */
export function isSlotOccupied(
  reservations: WeekReservation[],
  courtId: string,
  date: string,
  hour: number
): boolean {
  const slotStart = hour * 60
  const slotEnd = slotStart + 60
  return reservations.some((r) => {
    if (r.court_id !== courtId || r.date !== date) return false
    const [rh, rm] = r.start_time.split(":").map(Number)
    const [eh, em] = r.end_time.split(":").map(Number)
    const resStart = rh * 60 + rm
    const resEnd = eh * 60 + em
    return slotStart < resEnd && slotEnd > resStart
  })
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npx vitest run src/features/clubs/__tests__/calendar.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/clubs/utils/calendar.ts src/features/clubs/__tests__/calendar.test.ts
git commit -m "feat: calendar utility functions with full test coverage"
```

---

## Task 2: Data queries — `club-profile.ts`

**Files:**
- Create: `src/features/clubs/queries/club-profile.ts`

- [ ] **Step 1: Create the query file**

Create `src/features/clubs/queries/club-profile.ts`:

```typescript
import { createServiceClient } from "@/lib/supabase/server"
import type { Club, SportType } from "@/features/clubs/types"

export interface ClubProfileCourt {
  id: string
  name: string
  price_per_hour: number
  sport: SportType
}

export interface ActiveTournament {
  id: string
  name: string
  sport: string
  status: "open" | "in_progress"
  start_date: string
}

/** Returns the club by slug, or null if not found / inactive. */
export async function getClubBySlug(slug: string): Promise<Club | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()
  if (error) return null
  return data as Club | null
}

/** Returns active courts for a club. */
export async function getClubCourts(clubId: string): Promise<ClubProfileCourt[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("courts")
    .select("id, name, price_per_hour, sport")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name")
  if (error) return []
  return (data ?? []) as ClubProfileCourt[]
}

/** Returns tournaments with status 'open' or 'in_progress' for a club. */
export async function getClubActiveTournaments(clubId: string): Promise<ActiveTournament[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, sport, status, start_date")
    .eq("club_id", clubId)
    .in("status", ["open", "in_progress"])
    .order("start_date")
  if (error) return []
  return (data ?? []) as ActiveTournament[]
}

/** Returns true if the user is an active member of the club. */
export async function isClubMember(userId: string, clubId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("club_members")
    .select("id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) return false
  return data !== null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/queries/club-profile.ts
git commit -m "feat: club profile data queries (bySlug, courts, tournaments, membership)"
```

---

## Task 3: Reservations week API endpoint

**Files:**
- Create: `src/app/api/clubs/[clubId]/reservations/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/clubs/[clubId]/reservations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { searchParams } = request.nextUrl
  const weekStart = searchParams.get("weekStart")
  const weekEnd = searchParams.get("weekEnd")

  if (!weekStart || !weekEnd) {
    return NextResponse.json(
      { success: false, data: null, error: "weekStart y weekEnd son requeridos" },
      { status: 400 }
    )
  }

  const service = createServiceClient()

  const { data: courts, error: courtsError } = await service
    .from("courts")
    .select("id, name, price_per_hour, sport")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name")

  if (courtsError) {
    console.error("[GET /api/clubs/[clubId]/reservations] courts error:", courtsError.message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener canchas" },
      { status: 500 }
    )
  }

  const courtIds = (courts ?? []).map((c) => c.id)

  if (courtIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: { courts: [], reservations: [] },
      error: null,
    })
  }

  const { data: reservations, error: resError } = await service
    .from("reservations")
    .select("court_id, date, start_time, end_time")
    .in("court_id", courtIds)
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .neq("status", "cancelled")

  if (resError) {
    console.error("[GET /api/clubs/[clubId]/reservations] reservations error:", resError.message)
    return NextResponse.json(
      { success: false, data: null, error: "Error al obtener reservas" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { courts: courts ?? [], reservations: reservations ?? [] },
    error: null,
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clubs/[clubId]/reservations/route.ts
git commit -m "feat: GET /api/clubs/[clubId]/reservations — week availability endpoint"
```

---

## Task 4: joinClub Server Action

**Files:**
- Create: `src/features/clubs/actions/join-club.ts`

- [ ] **Step 1: Create the action file**

Create `src/features/clubs/actions/join-club.ts`:

```typescript
"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function joinClub(
  clubId: string,
  clubSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: "No autenticado" }
  }

  const service = createServiceClient()

  const { error } = await service
    .from("club_members")
    .insert({ user_id: user.id, club_id: clubId, role: "user", is_active: true })

  // 23505 = unique_violation — user is already a member, treat as success
  if (error && error.code !== "23505") {
    console.error("[joinClub]", error.message)
    return { success: false, error: "Error al unirse al club. Intenta de nuevo." }
  }

  revalidatePath(`/dashboard/clubs/${clubSlug}`)
  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/actions/join-club.ts
git commit -m "feat: joinClub server action — inserts into club_members with role user"
```

---

## Task 5: Make ClubCard clickable

**Files:**
- Modify: `src/features/clubs/components/ClubCard.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat src/features/clubs/components/ClubCard.tsx
```

- [ ] **Step 2: Add Link wrapper**

Replace the outer `<div>` with a `<Link>` from `next/link`. The full file becomes:

```typescript
"use client"

import Link from "next/link"
import { Building2, MapPin, Phone } from "lucide-react"
import type { ClubWithSports } from "@/features/clubs/queries/clubs"

const SPORT_LABEL: Record<string, string> = {
  futbol: "Fútbol",
  padel: "Pádel",
  tenis: "Tenis",
  pickleball: "Pickleball",
}

interface ClubCardProps {
  club: ClubWithSports
  index?: number
}

export function ClubCard({ club, index = 0 }: ClubCardProps) {
  return (
    <Link
      href={`/dashboard/clubs/${club.slug}`}
      className="animate-fade-in-up rounded-2xl bg-card border border-border overflow-hidden flex flex-col hover:border-foreground/40 transition-colors"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Cover */}
      {club.cover_url ? (
        <img
          src={club.cover_url}
          alt={club.name}
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className="w-full h-36 bg-foreground flex items-center justify-center">
          <Building2 className="size-10 text-white/30" />
        </div>
      )}

      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Name */}
        <h3 className="text-sm font-black text-foreground leading-tight">
          {club.name}
        </h3>

        {/* Location */}
        {(club.city || club.province) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500">
              {[club.city, club.province].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Sport badges */}
        {club.sports.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {club.sports.map((sport) => (
              <span
                key={sport}
                className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-muted text-foreground border-border"
              >
                {SPORT_LABEL[sport] ?? sport}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        {club.phone && (
          <div className="mt-auto pt-3 border-t border-border flex items-center gap-1.5">
            <Phone className="size-3 text-zinc-400 shrink-0" />
            <span className="text-[11px] text-zinc-500">{club.phone}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/clubs/components/ClubCard.tsx
git commit -m "feat: make ClubCard a clickable link to /dashboard/clubs/[slug]"
```

---

## Task 6: JoinClubButton (Client Component)

**Files:**
- Create: `src/features/clubs/components/JoinClubButton.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/JoinClubButton.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { joinClub } from "@/features/clubs/actions/join-club"

interface JoinClubButtonProps {
  clubId: string
  clubSlug: string
  initialIsMember: boolean
}

export function JoinClubButton({ clubId, clubSlug, initialIsMember }: JoinClubButtonProps) {
  const [isMember, setIsMember] = useState(initialIsMember)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (isMember) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-400 border border-border rounded-full px-5 py-2.5 select-none">
        Ya eres miembro ✓
      </span>
    )
  }

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const result = await joinClub(clubId, clubSlug)
      if (result.success) {
        setIsMember(true)
      } else {
        setError(result.error ?? "Error al unirse")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="bg-foreground text-white rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wide hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Uniéndose…" : "Unirse al club"}
      </button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/JoinClubButton.tsx
git commit -m "feat: JoinClubButton client component with optimistic member state"
```

---

## Task 7: ClubProfileHero

**Files:**
- Create: `src/features/clubs/components/ClubProfileHero.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/ClubProfileHero.tsx`:

```typescript
import { Building2, MapPin, Phone } from "lucide-react"
import type { Club } from "@/features/clubs/types"
import { SPORT_LABELS } from "@/lib/sports/config"
import { JoinClubButton } from "./JoinClubButton"

interface ClubProfileHeroProps {
  club: Club
  sports: string[]      // derived from courts
  isMember: boolean
}

export function ClubProfileHero({ club, sports, isMember }: ClubProfileHeroProps) {
  return (
    <div className="flex flex-col gap-0">
      {/* Cover */}
      <div className="relative w-full h-48 rounded-t-2xl overflow-hidden bg-foreground">
        {club.cover_url ? (
          <img
            src={club.cover_url}
            alt={club.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="size-12 text-white/20" />
          </div>
        )}

        {/* Logo overlay */}
        {club.logo_url && (
          <div className="absolute bottom-0 left-5 translate-y-1/2 size-16 rounded-full border-4 border-background overflow-hidden bg-card shadow-lg">
            <img src={club.logo_url} alt={`Logo ${club.name}`} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="flex flex-col gap-4 pt-10 pb-6 px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: name + location + sports */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-black text-foreground leading-tight">
              {club.name}
            </h1>

            {(club.city || club.province) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-500">
                  {[club.city, club.province].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            {sports.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sports.map((sport) => (
                  <span
                    key={sport}
                    className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border bg-muted text-foreground border-border"
                  >
                    {SPORT_LABELS[sport as keyof typeof SPORT_LABELS] ?? sport}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: join button */}
          <div className="shrink-0">
            <JoinClubButton
              clubId={club.id}
              clubSlug={club.slug}
              initialIsMember={isMember}
            />
          </div>
        </div>

        {/* Description */}
        {club.description && (
          <p className="text-sm text-zinc-500 leading-relaxed">
            {club.description}
          </p>
        )}

        {/* Phone */}
        {club.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="size-3 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500">{club.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/ClubProfileHero.tsx
git commit -m "feat: ClubProfileHero — cover, logo overlay, info, join button"
```

---

## Task 8: ClubCourtsSection

**Files:**
- Create: `src/features/clubs/components/ClubCourtsSection.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/ClubCourtsSection.tsx`:

```typescript
import type { ClubProfileCourt } from "@/features/clubs/queries/club-profile"

interface ClubCourtsSectionProps {
  courts: ClubProfileCourt[]
}

export function ClubCourtsSection({ courts }: ClubCourtsSectionProps) {
  if (courts.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
          Canchas disponibles
        </h2>
        <p className="text-xs text-zinc-400">Este club aún no tiene canchas registradas.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
        Canchas disponibles
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {courts.map((court) => (
          <div
            key={court.id}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4"
          >
            <span className="text-sm font-black text-foreground">{court.name}</span>
            <span className="text-xs text-zinc-500">
              ${court.price_per_hour.toFixed(2)}<span className="text-zinc-400"> / hora</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/ClubCourtsSection.tsx
git commit -m "feat: ClubCourtsSection — court name + price per hour grid"
```

---

## Task 9: ClubTournamentsSection

**Files:**
- Create: `src/features/clubs/components/ClubTournamentsSection.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/ClubTournamentsSection.tsx`:

```typescript
import Link from "next/link"
import { Trophy } from "lucide-react"
import type { ActiveTournament } from "@/features/clubs/queries/club-profile"
import { SPORT_LABELS } from "@/lib/sports/config"

interface ClubTournamentsSectionProps {
  tournaments: ActiveTournament[]
}

const STATUS_LABEL: Record<string, string> = {
  open: "Abierto",
  in_progress: "En curso",
}

const STATUS_CLASS: Record<string, string> = {
  open: "bg-green-50 text-green-700 border-green-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
}

export function ClubTournamentsSection({ tournaments }: ClubTournamentsSectionProps) {
  if (tournaments.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
          Torneos activos
        </h2>
        <p className="text-xs text-zinc-400">No hay torneos activos en este momento.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
        Torneos activos
      </h2>
      <div className="flex flex-col gap-2">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="size-4 text-zinc-400 shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-foreground truncate">{t.name}</span>
                <span className="text-[11px] text-zinc-500">
                  {SPORT_LABELS[t.sport as keyof typeof SPORT_LABELS] ?? t.sport}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_CLASS[t.status] ?? "bg-muted text-foreground border-border"}`}
              >
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
              <Link
                href={`/dashboard/tournaments/${t.id}`}
                className="text-[11px] font-black uppercase tracking-wide text-foreground underline underline-offset-2 hover:text-zinc-500 transition-colors"
              >
                Ver
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/ClubTournamentsSection.tsx
git commit -m "feat: ClubTournamentsSection — active tournaments list with status badges"
```

---

## Task 10: ClubWeekCalendar (Client Component)

**Files:**
- Create: `src/features/clubs/components/ClubWeekCalendar.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/ClubWeekCalendar.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  getWeekDates,
  addWeeks,
  getCurrentWeekMonday,
  formatWeekLabel,
  isSlotOccupied,
  type WeekReservation,
} from "@/features/clubs/utils/calendar"
import type { ClubProfileCourt } from "@/features/clubs/queries/club-profile"

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
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(getCurrentWeekMonday)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0]
    return today
  })
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6]

  // Ensure selectedDate stays within the displayed week
  useEffect(() => {
    if (!weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates[0])
    }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
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

  function handleSlotClick(courtId: string, date: string, hour: number) {
    const startTime = `${String(hour).padStart(2, "0")}:00`
    const endTime = `${String(hour + 1).padStart(2, "0")}:00`
    router.push(
      `/dashboard/reservations/new?courtId=${courtId}&date=${date}&startTime=${startTime}&endTime=${endTime}`
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
        Disponibilidad
      </h2>

      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, -1))}
          className="p-1.5 rounded-full border border-border hover:border-foreground transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-4 text-zinc-500" />
        </button>

        <span className="text-xs font-bold text-zinc-500">
          {formatWeekLabel(weekStart)}
        </span>

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
              <span className="uppercase text-[9px] font-black tracking-wide opacity-70">
                {DAY_NAMES[i]}
              </span>
              <span>{dayNum}</span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading && (
        <div className="py-12 text-center text-xs text-zinc-400">Cargando disponibilidad…</div>
      )}

      {fetchError && !loading && (
        <div className="py-12 text-center text-xs text-red-400">{fetchError}</div>
      )}

      {!loading && !fetchError && data && (
        <>
          {data.courts.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4">Este club no tiene canchas activas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse min-w-[320px]">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 pr-3 font-bold text-zinc-400 w-12">Hora</th>
                    {data.courts.map((court) => (
                      <th
                        key={court.id}
                        className="text-center py-1.5 px-1 font-bold text-foreground"
                      >
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
                        const occupied = isSlotOccupied(
                          data.reservations,
                          court.id,
                          selectedDate,
                          hour
                        )
                        return (
                          <td key={court.id} className="py-0.5 px-1 text-center align-middle">
                            {occupied ? (
                              <span className="block w-full rounded-md bg-zinc-200 text-zinc-400 py-1 text-center select-none">
                                —
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSlotClick(court.id, selectedDate, hour)}
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
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/ClubWeekCalendar.tsx
git commit -m "feat: ClubWeekCalendar — week navigation, day selector, court×hour grid"
```

---

## Task 11: ClubMemberSections

**Files:**
- Create: `src/features/clubs/components/ClubMemberSections.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/ClubMemberSections.tsx`:

```typescript
import Link from "next/link"
import { MessageCircle, ShoppingBag, CalendarDays } from "lucide-react"

interface ClubMemberSectionsProps {
  clubSlug: string
  clubId: string
}

export function ClubMemberSections({ clubSlug, clubId }: ClubMemberSectionsProps) {
  const links = [
    {
      href: `/dashboard/chat?clubId=${clubId}`,
      icon: MessageCircle,
      label: "Chat del club",
      description: "Mensajes con miembros y staff",
    },
    {
      href: `/dashboard/clubs/${clubSlug}/shop`,
      icon: ShoppingBag,
      label: "Tienda",
      description: "Productos y equipamiento del club",
    },
    {
      href: `/dashboard/reservations?clubId=${clubId}`,
      icon: CalendarDays,
      label: "Mis reservas",
      description: "Historial de reservas en este club",
    },
  ]

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
        Área de miembros
      </h2>
      <div className="flex flex-col gap-2">
        {links.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/40 transition-colors"
          >
            <Icon className="size-5 text-zinc-400 shrink-0" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-bold text-foreground">{label}</span>
              <span className="text-[11px] text-zinc-500">{description}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/ClubMemberSections.tsx
git commit -m "feat: ClubMemberSections — chat, shop, reservations links for members"
```

---

## Task 12: ClubProfileShell

**Files:**
- Create: `src/features/clubs/components/ClubProfileShell.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/clubs/components/ClubProfileShell.tsx`:

```typescript
import type { Club } from "@/features/clubs/types"
import type { ClubProfileCourt, ActiveTournament } from "@/features/clubs/queries/club-profile"
import { ClubProfileHero } from "./ClubProfileHero"
import { ClubCourtsSection } from "./ClubCourtsSection"
import { ClubTournamentsSection } from "./ClubTournamentsSection"
import { ClubWeekCalendar } from "./ClubWeekCalendar"
import { ClubMemberSections } from "./ClubMemberSections"

interface ClubProfileShellProps {
  club: Club
  courts: ClubProfileCourt[]
  tournaments: ActiveTournament[]
  isMember: boolean
}

export function ClubProfileShell({
  club,
  courts,
  tournaments,
  isMember,
}: ClubProfileShellProps) {
  // Derive unique sports from courts for the hero badges
  const sports = [...new Set(courts.map((c) => c.sport))]

  return (
    <div className="flex flex-col gap-8">
      <ClubProfileHero club={club} sports={sports} isMember={isMember} />
      <ClubCourtsSection courts={courts} />
      <ClubTournamentsSection tournaments={tournaments} />
      <ClubWeekCalendar clubId={club.id} />
      {isMember && (
        <ClubMemberSections clubSlug={club.slug} clubId={club.id} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/clubs/components/ClubProfileShell.tsx
git commit -m "feat: ClubProfileShell — orchestrates all club profile sections"
```

---

## Task 13: Club profile page

**Files:**
- Create: `src/app/(dashboard)/dashboard/clubs/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

`authorizeOrRedirect` returns `AuthContext` (type from `@/features/auth/types`) which includes `userId`. Use it directly.

Create `src/app/(dashboard)/dashboard/clubs/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation"
import { authorizeOrRedirect } from "@/features/auth/queries"
import {
  getClubBySlug,
  getClubCourts,
  getClubActiveTournaments,
  isClubMember,
} from "@/features/clubs/queries/club-profile"
import { ClubProfileShell } from "@/features/clubs/components/ClubProfileShell"

interface ClubProfilePageProps {
  params: Promise<{ slug: string }>
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { slug } = await params
  const ctx = await authorizeOrRedirect()

  // First: resolve the club (need its ID for subsequent queries)
  const club = await getClubBySlug(slug)
  if (!club) notFound()

  // Second: load courts, tournaments, and membership in parallel
  const [courts, tournaments, isMember] = await Promise.all([
    getClubCourts(club.id),
    getClubActiveTournaments(club.id),
    isClubMember(ctx.userId, club.id),
  ])

  return (
    <ClubProfileShell
      club={club}
      courts={courts}
      tournaments={tournaments}
      isMember={isMember}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Fix any type errors from Step 2**

If `authorizeOrRedirect` doesn't return the user, update the page to use the two-step pattern shown in Step 2. Adjust `isClubMember` call to use the resolved `user.id`.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass, including the calendar tests from Task 1.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/dashboard/clubs/\[slug\]/page.tsx
git commit -m "feat: /dashboard/clubs/[slug] — club profile page (Server Component)"
```

---

## Final Verification

- [ ] **Smoke test the flow in the browser**

  1. Start dev server: `npm run dev`
  2. Navigate to `/dashboard/clubs/`
  3. Verify club cards are now clickable links
  4. Click a club card — expect to land on `/dashboard/clubs/[slug]`
  5. Verify hero shows cover, name, location, sport badges, join button
  6. Verify courts section shows court names and prices
  7. Verify tournaments section (or empty state)
  8. Verify calendar loads, day selector works, hour grid renders
  9. Click "Unirse al club" — button should change to "Ya eres miembro ✓"
  10. Member sections should appear after joining

- [ ] **Commit anything remaining**

```bash
git status
# If clean: nothing to do
```
