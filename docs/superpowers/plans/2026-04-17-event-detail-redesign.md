# Event Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the event detail page (`/dashboard/events/[id]`) with a taller hero, color info chips, structured description with "Incluye" chips, attendee list with names, and an organizer card with WhatsApp button.

**Architecture:** Add one DB column (`event_includes text[]`), propagate it through types → utils → API routes → form, move `orgInitials` to a shared helpers file, then apply visual changes to the detail page Server Component section by section.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS 4 · Supabase PostgreSQL · Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/062_add_event_includes.sql` | Create | Add `event_includes` column to `events` |
| `src/features/activities/types.ts` | Modify | Add `event_includes` to `EventRow`, `CreateEventInput` |
| `src/features/activities/utils.ts` | Modify | Map `event_includes` in `mapEventRow` and `eventToForm` |
| `src/features/activities/hooks/useEventMutations.ts` | Modify | Pass `event_includes` in create/update payload |
| `src/app/api/events/route.ts` | Modify | Add `event_includes` to Zod POST schema |
| `src/app/api/events/[id]/route.ts` | Modify | Add `event_includes` to Zod PATCH schema |
| `src/app/api/admin/events/route.ts` | Modify | Add `event_includes` to Zod POST schema |
| `src/app/api/admin/events/[id]/route.ts` | Modify | Add `event_includes` to Zod PATCH schema |
| `src/features/activities/components/event-form/types.ts` | Modify | Add `event_includes` to `EventFormState` + `EMPTY_EVENT_FORM` |
| `src/features/activities/components/event-form/steps/Step4.tsx` | Modify | Add "Qué incluye" multi-value input |
| `src/features/activities/lib/helpers.ts` | Create | `orgInitials`, `attendeeColor` shared helpers |
| `src/features/activities/__tests__/helpers.test.ts` | Create | Unit tests for `orgInitials`, `attendeeColor` |
| `src/features/activities/components/EventCard.tsx` | Modify | Import `orgInitials` from `lib/helpers` (remove local def) |
| `src/app/(dashboard)/dashboard/events/[id]/page.tsx` | Modify | All visual changes: hero, chips, description, attendees, organizer |

---

## Task 1: DB Migration — Add `event_includes` column

**Files:**
- Create: `supabase/migrations/062_add_event_includes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/062_add_event_includes.sql
alter table events
  add column if not exists event_includes text[] not null default '{}';
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies without error. Verify with:
```bash
npx supabase db diff
```
Expected: no pending changes.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/062_add_event_includes.sql
git commit -m "feat(db): add event_includes column to events"
```

---

## Task 2: TypeScript Types + Utils

**Files:**
- Modify: `src/features/activities/types.ts`
- Modify: `src/features/activities/utils.ts`

- [ ] **Step 1: Add `event_includes` to `EventRow` and `CreateEventInput`**

In `src/features/activities/types.ts`, add the field to `EventRow` after `tags`:

```typescript
// Before:
  tags: string[] | null
  organizer_name: string | null

// After:
  tags: string[] | null
  event_includes: string[]
  organizer_name: string | null
```

Add to `CreateEventInput` after `tags`:
```typescript
// Before:
  tags?: string[]
  organizer_name?: string | null

// After:
  tags?: string[]
  event_includes?: string[]
  organizer_name?: string | null
```

- [ ] **Step 2: Update `mapEventRow` in `src/features/activities/utils.ts`**

Add `event_includes` after `tags`:
```typescript
// Before:
    tags:                  row.tags as string[] | null,
    organizer_name:        row.organizer_name as string | null,

// After:
    tags:                  row.tags as string[] | null,
    event_includes:        (row.event_includes as string[] | null) ?? [],
    organizer_name:        row.organizer_name as string | null,
```

- [ ] **Step 3: Update `eventToForm` in `src/features/activities/utils.ts`**

Add `event_includes` after `tags`:
```typescript
// Before:
    tags:                  event.tags ?? [],
    publishImmediately:    false,

// After:
    tags:                  event.tags ?? [],
    event_includes:        event.event_includes,
    publishImmediately:    false,
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/types.ts src/features/activities/utils.ts
git commit -m "feat(types): add event_includes to EventRow, mapEventRow, eventToForm"
```

---

## Task 3: API Routes — Zod Schema Update

**Files:**
- Modify: `src/app/api/events/route.ts`
- Modify: `src/app/api/events/[id]/route.ts`
- Modify: `src/app/api/admin/events/route.ts`
- Modify: `src/app/api/admin/events/[id]/route.ts`

All four files follow the same pattern: add `event_includes` to the Zod schema after `tags`.

- [ ] **Step 1: Update `src/app/api/events/route.ts`**

Find the line `tags: z.array(z.string().max(50)).max(10).default([]),` and add after it:
```typescript
  tags: z.array(z.string().max(50)).max(10).default([]),
  event_includes: z.array(z.string().max(200)).max(20).default([]),
  organizer_name: z.string().max(200).nullish(),
```

- [ ] **Step 2: Update `src/app/api/events/[id]/route.ts`**

Find the same `tags` line and add `event_includes` after it:
```typescript
  tags: z.array(z.string().max(50)).max(10),
  event_includes: z.array(z.string().max(200)).max(20).default([]),
  organizer_name: z.string().max(200).nullish(),
```

- [ ] **Step 3: Update `src/app/api/admin/events/route.ts`**

```typescript
  tags: z.array(z.string().max(50)).max(10).default([]),
  event_includes: z.array(z.string().max(200)).max(20).default([]),
  organizer_name: z.string().max(200).nullish(),
```

- [ ] **Step 4: Update `src/app/api/admin/events/[id]/route.ts`**

```typescript
  tags: z.array(z.string().max(50)).max(10),
  event_includes: z.array(z.string().max(200)).max(20).default([]),
  organizer_name: z.string().max(200).nullish(),
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/events/route.ts src/app/api/events/[id]/route.ts \
        src/app/api/admin/events/route.ts src/app/api/admin/events/[id]/route.ts
git commit -m "feat(api): add event_includes to events API Zod schemas"
```

---

## Task 4: Form Layer — EventFormState + Step4 + useEventMutations

**Files:**
- Modify: `src/features/activities/components/event-form/types.ts`
- Modify: `src/features/activities/components/event-form/steps/Step4.tsx`
- Modify: `src/features/activities/hooks/useEventMutations.ts`

- [ ] **Step 1: Add `event_includes` to `EventFormState` and `EMPTY_EVENT_FORM`**

In `src/features/activities/components/event-form/types.ts`, add after `tags`:
```typescript
// In EventFormState interface:
  tags: string[]
  event_includes: string[]
  publishImmediately: boolean

// In EMPTY_EVENT_FORM:
  tags: [],
  event_includes: [],
  publishImmediately: false,
```

- [ ] **Step 2: Add "Qué incluye" input to `Step4.tsx`**

Add after the tags `<div>` block and before `{isAdmin && ...}`:

```tsx
      <div className="flex flex-col gap-1.5">
        <Label>Qué incluye (opcional)</Label>
        <TagInput
          tags={form.event_includes}
          onChange={(items) => set("event_includes", items)}
        />
        <p className="text-[10px] text-zinc-400">
          Ej: Raquetas prestadas, Agua incluida… Máx. 20 items
        </p>
      </div>
```

The `TagInput` component is already imported and already handles a `string[]` — no changes needed to `TagInput`.

- [ ] **Step 3: Pass `event_includes` in `useEventMutations.ts`**

Open `src/features/activities/hooks/useEventMutations.ts`. Find the block that builds the payload (near the `tags` line at line ~55) and add `event_includes`:

```typescript
    // Before:
    tags:                  form.tags.length > 0 ? form.tags : undefined,
    // After:
    tags:                  form.tags.length > 0 ? form.tags : undefined,
    event_includes:        form.event_includes,
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/activities/components/event-form/types.ts \
        src/features/activities/components/event-form/steps/Step4.tsx \
        src/features/activities/hooks/useEventMutations.ts
git commit -m "feat(form): add event_includes field to event form"
```

---

## Task 5: Shared Helpers — `orgInitials` + `attendeeColor`

**Files:**
- Create: `src/features/activities/lib/helpers.ts`
- Create: `src/features/activities/__tests__/helpers.test.ts`
- Modify: `src/features/activities/components/EventCard.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/activities/__tests__/helpers.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { orgInitials, attendeeColor } from "../lib/helpers"

describe("orgInitials", () => {
  it("returns single uppercase letter for single-word name", () => {
    expect(orgInitials("Carlos")).toBe("C")
  })
  it("returns first+last initials for multi-word name", () => {
    expect(orgInitials("Club Deportivo Pichincha")).toBe("CP")
  })
  it("handles extra whitespace", () => {
    expect(orgInitials("  Juan  Pérez  ")).toBe("JP")
  })
  it("returns empty string for empty input", () => {
    expect(orgInitials("")).toBe("")
  })
})

describe("attendeeColor", () => {
  it("returns an object with bg and text strings", () => {
    const color = attendeeColor("user-123")
    expect(color).toHaveProperty("bg")
    expect(color).toHaveProperty("text")
    expect(typeof color.bg).toBe("string")
    expect(typeof color.text).toBe("string")
  })
  it("returns the same color for the same userId", () => {
    expect(attendeeColor("abc")).toEqual(attendeeColor("abc"))
  })
  it("returns a color within the palette for any userId", () => {
    const colors = [attendeeColor("a"), attendeeColor("b"), attendeeColor("z")]
    colors.forEach((c) => {
      expect(c.bg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(c.text).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/activities/__tests__/helpers.test.ts
```

Expected: FAIL — `Cannot find module '../lib/helpers'`

- [ ] **Step 3: Create `src/features/activities/lib/helpers.ts`**

```typescript
const AVATAR_PALETTE: Array<{ bg: string; text: string }> = [
  { bg: "#e0e7ff", text: "#4338ca" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fee2e2", text: "#b91c1c" },
  { bg: "#e0f2fe", text: "#0369a1" },
]

function hashUserId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === "") return ""
  if (parts.length === 1) return (parts[0]?.[0] ?? "").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

export function attendeeColor(userId: string): { bg: string; text: string } {
  return AVATAR_PALETTE[hashUserId(userId) % AVATAR_PALETTE.length]!
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/activities/__tests__/helpers.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Update `EventCard.tsx` to import `orgInitials` from helpers**

In `src/features/activities/components/EventCard.tsx`, remove the local `orgInitials` function (lines 44–48) and add the import:

```typescript
// Add to imports at the top:
import { orgInitials } from "@/features/activities/lib/helpers"
```

Remove these lines from the file:
```typescript
function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.[0] ?? "").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}
```

- [ ] **Step 6: Verify build still passes**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/activities/lib/helpers.ts \
        src/features/activities/__tests__/helpers.test.ts \
        src/features/activities/components/EventCard.tsx
git commit -m "feat(helpers): extract orgInitials to shared lib, add attendeeColor"
```

---

## Task 6: Detail Page — Hero Height + Info Chips

**Files:**
- Modify: `src/app/(dashboard)/dashboard/events/[id]/page.tsx`

- [ ] **Step 1: Increase hero height**

Find line:
```tsx
      <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-100"
           style={{ height: "280px" }}>
```

Change to:
```tsx
      <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-100"
           style={{ height: "340px" }}>
```

- [ ] **Step 2: Add `formatDateShort` helper and `event_includes` to the SELECT**

Add the local helper after `daysUntil`:
```typescript
function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}
```

In `fetchEventDetail`, add `event_includes` to the select string:
```typescript
      `
      id, title, description, sport, event_type, status,
      club_id, city, location, start_date, end_date,
      image_url, is_free, price, max_capacity, min_participants,
      visibility, registration_deadline, tags, event_includes,
      organizer_name, organizer_contact, created_at, updated_at,
      clubs ( name ),
      event_registrations ( count )
      `
```

- [ ] **Step 3: Replace the 2-card grid with color chips**

Find and remove the entire `{/* ── Quick info ──... */}` section (the `<div className="grid grid-cols-2 gap-3 mt-4">` block with both date and location cards).

Replace with:

```tsx
      {/* ── Info chips ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] capitalize">
          📅 {formatDateShort(event.start_date)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
          🕘 {formatTime(event.start_date)}{event.end_date && ` – ${formatTime(event.end_date)}`}
        </span>
        {(event.location ?? event.city) && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#fdf4ff] text-[#a21caf] border border-[#f5d0fe]">
            📍 {[event.location, event.city].filter(Boolean).join(", ")}
          </span>
        )}
        {spotsLeft != null && !isFull && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
            👥 {spotsLeft} lugar{spotsLeft !== 1 ? "es" : ""} libre{spotsLeft !== 1 ? "s" : ""}
          </span>
        )}
        {isFull && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
            ⛔ Lleno
          </span>
        )}
      </div>
```

- [ ] **Step 4: Remove `Calendar` and `MapPin` from lucide imports**

Only `Calendar` and `MapPin` are unused after this task. `Phone`, `Building2`, `UserCircle` are still needed by later sections.

```typescript
// Before:
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  UserCircle,
  Phone,
  Building2,
  ArrowLeft,
  Tag,
} from "lucide-react"

// After:
import {
  Users,
  Clock,
  UserCircle,
  Phone,
  Building2,
  ArrowLeft,
  Tag,
} from "lucide-react"
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/dashboard/events/[id]/page.tsx
git commit -m "feat(events): hero 340px, info chips replace 2-card grid"
```

---

## Task 7: Detail Page — Description + Includes Chips

**Files:**
- Modify: `src/app/(dashboard)/dashboard/events/[id]/page.tsx`

- [ ] **Step 1: Replace the description section**

Find the current description block:
```tsx
      {/* ── Description ──────────────────────────────────────── */}
      {event.description && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Sobre el evento
          </p>
          <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>
      )}
```

Replace with:
```tsx
      {/* ── Description ──────────────────────────────────────── */}
      {(event.description || event.event_includes.length > 0) && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Sobre el evento
          </p>
          {event.description && (
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line mb-4">
              {event.description}
            </p>
          )}
          {event.event_includes.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-2">
                Incluye
              </p>
              <div className="flex flex-wrap gap-2">
                {event.event_includes.map((item) => (
                  <span
                    key={item}
                    className="text-[11px] font-bold bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] rounded-md px-2.5 py-1"
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/events/[id]/page.tsx
git commit -m "feat(events): description section with optional event_includes chips"
```

---

## Task 8: Detail Page — Attendees List with Names

**Files:**
- Modify: `src/app/(dashboard)/dashboard/events/[id]/page.tsx`

- [ ] **Step 1: Add import for helpers**

Add to the imports at the top of the page file:
```typescript
import { orgInitials, attendeeColor } from "@/features/activities/lib/helpers"
```

- [ ] **Step 2: Replace the attendees section**

Find the entire `{/* ── Attendees ──... */}` block (the section with the avatar stack, roughly lines 322–361) and replace with:

```tsx
      {/* ── Attendees ────────────────────────────────────────── */}
      {attendees.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Quiénes van ({event.registration_count})
          </p>
          <div className="flex flex-col">
            {attendees.slice(0, 3).map((a) => {
              const colors = attendeeColor(a.user_id)
              const initials = a.display_name ? orgInitials(a.display_name) : "?"
              return (
                <div
                  key={a.user_id}
                  className="flex items-center gap-2.5 py-2 border-b border-[#f9fafb] last:border-0"
                >
                  <div
                    className="size-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {a.display_name ?? "Participante"}
                  </span>
                </div>
              )
            })}
          </div>
          {event.registration_count > 3 && (
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#3b82f6]">
              Ver todos los inscritos ({event.registration_count}) →
            </span>
          )}
        </div>
      )}
```

Remove `UserCircle` from the import (no longer used after replacing attendees section):

```typescript
// Before:
import {
  Users,
  Clock,
  UserCircle,
  Phone,
  Building2,
  ArrowLeft,
  Tag,
} from "lucide-react"

// After:
import {
  Users,
  Clock,
  Phone,
  Building2,
  ArrowLeft,
  Tag,
} from "lucide-react"
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/events/[id]/page.tsx
git commit -m "feat(events): attendees list with initials and names"
```

---

## Task 9: Detail Page — Organizer Card

**Files:**
- Modify: `src/app/(dashboard)/dashboard/events/[id]/page.tsx`

- [ ] **Step 1: Replace the organizer section**

Find the entire `{/* ── Organizer ──... */}` block (the section with `Building2`, `UserCircle`, `Phone` icons) and replace with:

```tsx
      {/* ── Organizer ────────────────────────────────────────── */}
      {(event.organizer_name ?? event.club_name) && (
        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400 mb-3">
            Organiza
          </p>
          <div className="bg-[#fafafa] border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {event.club_name && (
                <div
                  className="size-11 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #1e40af, #3b82f6)" }}
                >
                  {orgInitials(event.club_name)}
                </div>
              )}
              <div>
                {event.club_name && (
                  <p className="text-sm font-black text-foreground">{event.club_name}</p>
                )}
                {event.organizer_name && (
                  <p className="text-[11px] text-zinc-500">
                    Contacto: {event.organizer_name}
                  </p>
                )}
              </div>
            </div>
            {event.organizer_contact && (
              <a
                href={`https://wa.me/${event.organizer_contact.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] rounded-lg px-3 py-2"
              >
                📱 WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 2: Remove `Phone` and `Building2` from lucide imports**

```typescript
// Before:
import {
  Users,
  Clock,
  Phone,
  Building2,
  ArrowLeft,
  Tag,
} from "lucide-react"

// After:
import {
  Users,
  Clock,
  ArrowLeft,
  Tag,
} from "lucide-react"
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Full build verification**

```bash
npx next build 2>&1 | tail -20
```

Expected: build completes successfully with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/events/[id]/page.tsx
git commit -m "feat(events): organizer card with avatar and WhatsApp button"
```

---

## Done

All 9 tasks produce the full redesign. Verify manually by:
1. Opening `/dashboard/events` and clicking into any event detail
2. Checking hero height, info chips, description (with or without `event_includes`), attendee names, organizer card
3. Creating a new event via the form — the "Qué incluye" field should appear in Step 4
