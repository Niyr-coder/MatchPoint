# Organizer Panel — Quedadas System Design

**Date:** 2026-04-14
**Status:** Approved
**Scope:** Pickleball only (initial release)

---

## Overview

A dedicated organizer panel that allows users with the `can_organize` permission (or relevant club roles) to create and manage "quedadas" — informal, simplified tournaments built on top of the existing tournament infrastructure.

Quedadas reuse the existing `tournaments` table, API routes, bracket logic, and participant management. The organizer experience is a focused UI layer that hides tournament complexity (no prizes, sponsors, or analytics).

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Data model | Flag on existing `tournaments` table | Avoids duplicating bracket/participant logic |
| Scope | Pickleball only for initial release | Simplifies modality/dynamic combos |
| Permissions | Badge `can_organize` + COACH/MANAGER/OWNER roles | Integrates with existing badge system |
| Guest players | `guest_name` + `guest_lastname` columns in participants | No platform account needed for casual games |
| Bracket | Reuse existing `BracketView` for Round Robin / Elimination | New rotation scoreboard only for King of Court / Popcorn |

---

## Database Changes

Single migration adding four columns across two tables.

```sql
-- Migration 054: Organizer quedadas support

-- 1. Event type on tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'tournament'
    CHECK (event_type IN ('tournament', 'quedada'));

-- 2. Game dynamic on tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS game_dynamic TEXT
    CHECK (game_dynamic IN ('standard', 'king_of_court', 'popcorn', 'round_robin'));

-- 3. Guest player support on participants
ALTER TABLE tournament_participants
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_lastname TEXT;

-- Constraint: either user_id OR guest_name must be present
ALTER TABLE tournament_participants
  ADD CONSTRAINT participant_identity_check
    CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
```

**RLS:** Quedadas follow the same RLS policies as tournaments. Public quedadas (`is_public = true`) are readable by any authenticated user. Private quedadas are readable only by club members.

---

## Permissions

Who can access the organizer panel:

1. **Automatic access** — users with role `OWNER`, `MANAGER`, or `COACH` in any club
2. **Granted access** — users with badge `can_organize` assigned by a club admin

The nav item "Mis Quedadas" and the "Organizar quedada" button in the tournaments section are conditionally rendered based on this check. No access → buttons hidden entirely.

---

## Game Dynamics

| Dynamic | Has Bracket | Description |
|---------|------------|-------------|
| `standard` | Yes (existing) | Normal matches, no rotation |
| `king_of_court` | No | Winner stays on court, loser rotates out |
| `popcorn` | No | Random rotation by points |
| `round_robin` | Yes (existing) | Everyone plays everyone |

King of the Court and Popcorn use a **rotation scoreboard**: a simple UI that records who won each point and who rotates. No traditional bracket is generated.

---

## Player Management

Two types of participants per quedada:

**Registered users**
- Added by organizer via name/@username search
- Or via self-join through invitation link
- `user_id` is set, `guest_name` / `guest_lastname` are NULL

**Guest / temporary players**
- Added by organizer entering first name + last name only
- No platform account required
- `user_id` is NULL, `guest_name` + `guest_lastname` are set
- Displayed with an **INVITADO** badge in the player list
- Exist only for the duration of the quedada

Invitation links use the existing `InviteLinkGenerator` component. Organizer can copy, share, or revoke the link at any time.

---

## UI Architecture

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard/organizer` | `OrganizerShell` | Main panel — list of organizer's quedadas |
| `/dashboard/organizer/new` | `QuedadaWizard` | 3-step creation wizard |
| `/dashboard/organizer/[id]` | `QuedadaManagePanel` | Manage active quedada |

### New Components (`src/features/organizer/`)

```
src/features/organizer/
  components/
    OrganizerShell.tsx       ← tabs: Mis Quedadas / Invitaciones / Historial
    QuedadaWizard.tsx        ← 3-step wizard (details → date/access → players)
    QuedadaManagePanel.tsx   ← tabs: Jugadores / Bracket / Invitación
    AddPlayerModal.tsx       ← toggle: registered user search vs. guest by name
    RotationScoreboard.tsx   ← scoreboard for King of Court / Popcorn dynamics
  queries.ts                 ← queries filtered by event_type='quedada'
  types.ts                   ← QuedadaGameDynamic, GuestParticipant types
```

### Reused Components

- `BracketView` — used as-is for Round Robin and Elimination dynamics
- `InviteLinkGenerator` — used as-is for invitation links
- All tournament API routes (`/api/tournaments/[id]/*`) — reused with `event_type` filter

### Wizard Steps

**Step 1 — Detalles**
- Name (text input)
- Sport (Pickleball, fixed for now — "más deportes próximamente" label)
- Modality: Individual / Dobles / Mixto
- Game dynamic: Estándar / King of the Court / Popcorn / Round Robin
- Max players: 4 / 8 / 16 / 32

**Step 2 — Fecha y acceso**
- Date picker + time picker
- Visibility toggle: 🔒 Solo miembros del club / 🌐 Pública

**Step 3 — Jugadores**
- Search and add registered users
- Auto-generated invitation link (copy / share)
- Guest players can be added here or later from the manage panel

### OrganizerShell Tabs

- **Mis Quedadas** — list of active/upcoming quedadas with status badges
- **Invitaciones Pendientes** — players who haven't confirmed yet
- **Historial** — completed / cancelled quedadas

### QuedadaManagePanel Tabs

- **Jugadores** — player list with confirm/remove actions, progress bar, add player button
- **Bracket / Resultados** — BracketView (for bracket dynamics) or RotationScoreboard (for rotation dynamics)
- **Invitación** — active link with copy / share / revoke actions

---

## Navigation Integration

- **Primary nav** — "Mis Quedadas" link (visible only to organizers)
- **Tournaments section** — "Organizar quedada" button at top of tournaments list

Both entry points lead to `/dashboard/organizer`.

---

## Out of Scope (initial release)

- Multi-sport support (Pádel, Tenis, Fútbol) — deferred, architecture supports it via `sport` column
- Notifications when players join a quedada — can be added in a follow-up
- Real-time scoreboard updates (Supabase Realtime) — not needed for MVP
- Analytics / feedback for quedadas — existing tournament analytics not exposed

---

## Success Criteria

1. Organizer can create a Pickleball quedada in under 3 minutes
2. Guest players (no account) can be added by name only
3. Invitation link works for self-join by registered users
4. King of the Court / Popcorn games record rotation results without a bracket
5. Round Robin / Elimination games reuse existing BracketView without modification
6. Only users with `can_organize` badge or COACH/MANAGER/OWNER role see the organizer UI
