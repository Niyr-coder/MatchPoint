# Event Card Redesign — Design Spec
**Date:** 2026-04-17
**Status:** Approved

---

## Goal

Enrich the `EventCard` component with contextual information that helps users decide whether to register without entering the event detail page. Replace the generic "Ver más" CTA with a state-aware action button.

---

## Layout

Vertical card (same structure as current). No layout change. Fields that have no data are simply not rendered — the card degrades gracefully.

---

## New Fields

All new fields are **conditional**: they only render when the underlying data is present.

| Field | Source | Condition |
|---|---|---|
| Urgency banner | `registration_deadline` | Only when deadline exists AND is ≤ 3 days away |
| Capacity progress bar | `max_capacity` | Replaces the plain text counter when `max_capacity` is set |
| End time + duration | `end_date` | Appended to the date line when `end_date` exists |
| Visibility badge | `visibility` | Only for `club_only` and `invite_only` (public is the default, not shown) |
| Featured star | `is_featured` | Star pill in top-left of image when `true` |
| Organizer name | `organizer_name` | Row with avatar initials + name when present |
| Tags | `tags` | Row of tag chips when array is non-empty |

---

## Component Structure (top to bottom)

```
[Cover image]
  └── [★ Featured pill]    top-left, if is_featured
  └── [Price/Free pill]    top-right, always
  └── [Full overlay]       if spotsLeft === 0

[Body]
  Badge row:   [EventType] [Sport] [Visibility?] [✓ Inscrito?]
  Title        (line-clamp-2)
  Description  (line-clamp-2, if present)
  Organizer    avatar initials + name, if organizer_name
  Tags         #tag chips, if tags non-empty
  Urgency      ⏰ orange banner, if deadline ≤ 3 days
  ─────────────────────────────────────────────────
  Date         📅 day, date · HH:MM [– HH:MM (Xh)] if end_date
  Location     📍 location + city
  Capacity     "X de Y lugares" + progress bar
                  fill: black ≤75% | amber 75–99% | red 100%
                  label: "⚠ Casi lleno" when ≥80%
  ─────────────────────────────────────────────────
  CTA row:
    [Primary btn]  "Inscribirme" | "✓ Ya estás inscrito" | (full: disabled)
    [Info btn]     Secondary pill → navigates to /dashboard/events/:id
```

---

## CTA State Machine

| Condition | Primary button | Style | Action |
|---|---|---|---|
| `is_registered === true` | ✓ Ya estás inscrito | Green outlined | Navigates to detail page (cancellation managed there) |
| Event full (`spotsLeft === 0`) | Sin lugares | Disabled, muted | — |
| `canRegister === false` (deadline passed / not published) | Registro cerrado | Disabled, muted | — |
| Default | Inscribirme | Black filled | `POST /api/events/:id/register` → `router.refresh()` |

The secondary "Info" button always appears and navigates to the event detail page (`/dashboard/events/:id`).

**Client Component strategy:** The card body stays a Server Component. Extract a new `EventCardCTA` client component that receives `eventId`, `isRegistered`, `canRegister`, `isFull` as props and handles the fetch + loading state. This mirrors the existing `EventRegisterButton` pattern but sized for a card.

---

## Capacity Bar Colors

| Fill % | Bar color | Label |
|---|---|---|
| < 75% | `#0a0a0a` (black) | — |
| 75–99% | `#f59e0b` (amber) | ⚠ Casi lleno |
| 100% | `#ef4444` (red) | Full overlay on image |

---

## Props Change

`EventCard` needs two new optional props:

```typescript
end_date?: string | null        // for duration calculation
registration_deadline?: string | null
is_featured?: boolean
visibility?: EventVisibility
tags?: string[] | null
organizer_name?: string | null
is_registered?: boolean         // already in EventWithClub, just needs to be wired
```

All are optional and default to null/false — no breaking change for existing call sites.

---

## Files to Modify / Create

| File | Change |
|---|---|
| `src/features/activities/components/EventCard.tsx` | Main redesign — add all new fields |
| `src/features/activities/components/EventCardCTA.tsx` | **New** client component for register/inscribed/disabled button |
| `src/features/activities/components/EventCardSkeleton.tsx` | Match new height |
| `src/app/(dashboard)/dashboard/events/page.tsx` | Pass new props from `EventWithClub` |
| `src/features/activities/components/ClubEventsView.tsx` | Same prop pass-through |
| `src/features/activities/components/AdminEventsView.tsx` | Same prop pass-through |

---

## Out of Scope

- No inline registration logic (the "Inscribirme" button navigates to the event detail page or triggers a mutation — to be decided at implementation time based on existing registration flow)
- No design changes to the event detail page
- No changes to database schema or API — all fields already exist in `EventWithClub`
