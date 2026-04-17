# Event Detail Page Redesign

**Date:** 2026-04-17  
**File:** `src/app/(dashboard)/dashboard/events/[id]/page.tsx`  
**Scope:** Visual redesign of the event detail page — no new routes, no behavior changes to the CTA.

---

## Problem

The event detail page (`/dashboard/events/[id]`) is functional but visually weak. Three sections in particular feel unfinished:

- **Descripción** — plain text block with no structure or visual hierarchy
- **Asistentes** — avatar stack with no names; feels anonymous
- **Organizador** — flat list of text lines; no identity or actionable contact

The hero is slightly undersized (280px) and the info quick-view (2 grey cards) lacks visual character.

---

## What Changes

### 1. Hero — height bump

- **Before:** `height: 280px`
- **After:** `height: 340px`
- No other structural changes; gradient overlay and badge positions stay the same.

### 2. Info quick-view — replace 2-card grid with 4 color chips

Remove the 2-column card grid. Replace with a horizontal row of compact chips, each with a background color that signals its category:

| Chip | Color | Content |
|------|-------|---------|
| Fecha | green-50 / green-700 | `📅 Sáb 19 abr 2026` |
| Hora | blue-50 / blue-700 | `🕘 09:00 – 11:00 (2h)` — uses existing `formatTimeRange` |
| Lugar | purple-50 / purple-700 | `📍 {location}, {city}` |
| Cupos | orange-50 / orange-700 | `👥 {N} lugares libres` or `Lleno` — only shown when `max_capacity != null` |

Chips wrap on mobile. The location chip is omitted if both `location` and `city` are null.

### 3. Descripción — text + optional "Incluye" chips

The description block gains a secondary section below the text:

**"Incluye" chips** — shown only when `event.event_includes` is non-empty. Each entry renders as a green chip: `✓ {item}`.

**DB change required:** Add `event_includes text[] default '{}'` to the `events` table via migration. The column is optional — existing events have an empty array and the chips section is hidden when empty. The event creation/edit form (`EventForm`) gains an optional multi-value text input for this field.

If the user/admin leaves `event_includes` empty, the section renders exactly as before (just the description text).

### 4. Asistentes — list with names

Replace the avatar stack with a short list showing initials + full name for the first 3 attendees, followed by a "Ver todos los inscritos (N) →" link.

- Initials are colored with a stable color derived from `user_id` (pick from a palette of 6 pastel pairs, index = `hashCode(user_id) % 6`).
- The `display_name` from `profiles` is already fetched — no new DB queries needed.
- The "Ver todos" link has no destination for now; it renders as a non-interactive `<span>` with a `→` and can be wired to a future sheet/modal.
- For events with `visibility !== 'public'`, attendees are still hidden (existing logic unchanged).

### 5. Organizador — card with avatar + action buttons

Replace the flat text list with a styled card:

- **Avatar:** 46×46 rounded square showing club initials (e.g. "CDP") with a blue gradient background. Same `orgInitials()` helper already in `EventCard.tsx` — move to a shared util.
- **Name row:** `{club_name}` bold + `Contacto: {organizer_name}` secondary.
- **Action buttons (conditional):**
  - "📱 WhatsApp" — shown only when `organizer_contact` is non-null. `href="https://wa.me/{sanitized_number}"`.
  - "🏢 Ver club" — shown only when `club_id` is non-null. `href="/club/{club_id}"` (links to existing club profile route).

---

## What Does NOT Change

- CTA block (registration button + progress bar + meta line) — no changes.
- Tags section — no changes.
- Back link — no changes.
- All existing auth/authorization logic.
- The `EventCard` list component is out of scope.

---

## DB Migration

```sql
alter table events
  add column if not exists event_includes text[] not null default '{}';
```

One migration file. No RLS changes needed (inherits existing event policies).

---

## Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_event_includes.sql` | Add `event_includes` column |
| `src/features/activities/types.ts` | Add `event_includes: string[]` to `EventWithClub` |
| `src/features/activities/utils.ts` | Map `event_includes` in `mapEventRow` |
| `src/features/activities/lib/helpers.ts` _(new)_ | Extract `orgInitials`, add `attendeeColor(userId)` |
| `src/app/(dashboard)/dashboard/events/[id]/page.tsx` | Apply all visual changes |
| `src/features/activities/components/EventForm.tsx` | Add optional `event_includes` multi-input |

---

## Success Criteria

- Hero renders at 340px with no visual regression.
- Info chips show correct data and omit gracefully when fields are null.
- Description text unchanged; "Incluye" section hidden when `event_includes` is empty.
- Attendees list shows names for public events; hidden for non-public (existing behavior).
- Organizer card shows WhatsApp button only when `organizer_contact` exists.
- Build passes, no TypeScript errors.
- No regression on event registration flow.
