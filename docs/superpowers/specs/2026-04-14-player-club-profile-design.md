# Player Club Profile Flow — Design Spec

**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** `/dashboard/clubs/` list → `/dashboard/clubs/[slug]` profile page

---

## Overview

Add a clickable club profile page that players reach by clicking any club card in the existing `/dashboard/clubs/` listing. The profile is a single scrollable page (no tabs) serving as a hub: club info, available courts, active tournaments, weekly reservation calendar, and member-only sections.

---

## Architecture

### New Route

```
src/app/(dashboard)/dashboard/clubs/[slug]/page.tsx
```

Server Component. Receives `slug` as a route param. Loads all data in parallel via `Promise.all()`. Renders `ClubProfileShell` with all data as props.

### New Files

```
src/features/clubs/
  components/
    ClubProfileShell.tsx       ← orchestrates all sections
    ClubProfileHero.tsx        ← cover, logo, info, join button
    ClubCourtsSection.tsx      ← court cards (number + price/hour)
    ClubTournamentsSection.tsx ← active tournaments list
    ClubWeekCalendar.tsx       ← weekly reservation grid (Client Component)
    ClubMemberSections.tsx     ← chat, shop, my reservations (member-only)
  queries/
    club-profile.ts            ← getClubBySlug, getClubCourts, getClubActiveTournaments
  actions/
    join-club.ts               ← Server Action: insert into user_roles with role USER
```

### Modified Files

- `src/features/clubs/components/ClubCard.tsx` — wrap content in a `<Link href={/dashboard/clubs/${club.slug}}>` 
- `src/features/clubs/queries/clubs.ts` — ensure `slug` is included in `getClubs()` return

---

## Data Loading

All loaded server-side on page entry:

| Query | Source | Notes |
|-------|--------|-------|
| `getClubBySlug(slug)` | `clubs` table | Full club row. 404 if not found or not active. |
| `getClubCourts(clubId)` | `courts` table | Active courts only (`is_active = true`). |
| `getClubActiveTournaments(clubId)` | `tournaments` table | Status `open` or `in_progress`. |
| `isClubMember(userId, clubId)` | `user_roles` table | Returns boolean. |

### Weekly Calendar (Client)

`ClubWeekCalendar` is a `"use client"` component. It receives courts as props and fetches:

```
GET /api/clubs/[clubId]/reservations?week=YYYY-WW
```

Returns reservations for the selected week. The component manages week navigation state locally.

---

## Page Layout (scroll order)

### 1. Hero

- Full-width cover image (`h-48`), or dark placeholder if none
- Club logo overlaid (circle, bottom-left of cover)
- Club name (bold, large)
- City + province
- Sport badges (Fútbol, Pádel, Tenis, Pickleball)
- Description (if present)
- Phone (if present)
- **Join button** — right-aligned on desktop, below info on mobile
  - Not a member: "Unirse al club" (primary, calls `joinClub` Server Action)
  - Already a member: "Ya eres miembro ✓" (disabled state)

### 2. Courts

- Section title: "Canchas disponibles"
- Grid: 2 cols (mobile) / 3 cols (desktop)
- Each card shows: court number/name + price per hour
- No surface type shown
- Empty state if no active courts

### 3. Active Tournaments

- Section title: "Torneos activos"
- List of tournaments: name, sport, status badge (Abierto / En curso)
- Each row has "Ver torneo" link
- Empty state if none

### 4. Weekly Reservation Calendar

- Section title: "Disponibilidad esta semana"
- Navigation: `← Semana anterior | [current week label] | Semana siguiente →`
- Grid: courts as columns, hourly time slots (07:00–22:00) as rows
- Slot colors: green = available, dark gray = occupied
- Tap on available slot → navigate to reservation creation with court + time pre-filled
- Any player can view and tap (no membership required)

### 5. Member Sections *(visible only if `isMember === true`)*

Three horizontal action cards:
- **Chat del club** → link to club chat channel
- **Tienda** → link to `/dashboard/clubs/[slug]/shop`
- **Mis reservas** → last 5 reservations by this user in this club

---

## Join Flow

1. Player taps "Unirse al club"
2. `joinClub(clubId)` Server Action runs:
   - Verifies user is authenticated
   - Inserts row into `user_roles` (`user_id`, `club_id`, `role: 'USER'`, `is_active: true`)
   - On conflict (already a member): no-op
3. Page revalidates — button switches to "Ya eres miembro ✓"
4. Member sections appear at bottom of page

No new tables needed. Uses existing `user_roles` infrastructure. Being a club USER member enables receiving club messages via existing chat/notification channels.

---

## Error Handling

- Club not found or inactive → `notFound()` (Next.js 404)
- `joinClub` failure → show inline error toast, do not redirect
- Calendar fetch failure → show empty state with retry option, do not crash page

---

## Out of Scope

- Court reservation creation UI (navigates to existing reservation flow)
- Club shop UI (links to existing shop)
- Manager/Owner view (handled by existing club management dashboard)
- Push notifications for club communications (existing notification system handles this)
