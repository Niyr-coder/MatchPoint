# Quedadas — Court Assignment Flow Design

**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** QuedadaWizard + RotationPanel + DB schema

---

## Problem

The current wizard asks for a fixed "Máx. jugadores" (4/8/16/32) with no connection to how many courts are available. The RotationPanel lets the organizer pick 1–4 courts via hardcoded buttons before starting, but that information is never saved and the UI gives no visual feedback on who will play vs. wait. The result is that the organizer has to mentally calculate distribution themselves.

---

## Goal

The organizer picks how many courts they have available **during wizard creation**. The system immediately shows a live breakdown: how many players will be active vs. waiting. This value is saved to the DB and pre-loaded in the RotationPanel on event day.

---

## Architecture

### Players per court

Derived from `modality` (already stored):

| Modality | Players per court |
|----------|------------------|
| Singles  | 2 (1v1)          |
| Dobles   | 4 (2v2)          |
| Mixtos   | 4 (2v2)          |

Formula: `activePlayers = courtCount × playersPerCourt`  
Waiting: `waitingPlayers = max_participants - activePlayers`

---

## Wizard Changes

### Step 1 — Detalles

New field added **after Modalidad**:

**Canchas disponibles** — button picker 1–6.

**Live preview banner** (appears as soon as courts + modality are set):

```
2 canchas × 4 jugadores = 8 activos · 4 en espera
```

The preview updates reactively when either `court_count` or `modality` changes.

**Máx. jugadores** changes from fixed buttons (4/8/16/32) to a **numeric input**:
- Minimum: `courtCount × playersPerCourt` (validated, cannot go below)
- Maximum: 64
- Default: starts at `courtCount × playersPerCourt` and adjusts when courts change

Validation rule: `max_participants >= court_count × playersPerCourt`. If the user reduces courts after setting a max, the max resets to the new minimum automatically.

### Step 3 — Resumen

Summary line updated to include:

```
2 canchas · 8 activos · 4 en espera
```

---

## Data Changes

### DB Migration

New nullable column on `tournaments` table:

```sql
ALTER TABLE tournaments ADD COLUMN court_count integer DEFAULT 1;
```

Default 1 ensures backward compatibility with existing quedadas.

### API — `POST /api/quedadas`

`createQuedadaSchema` adds:

```typescript
court_count: z.number().int().min(1).max(6).optional().default(1)
```

`createTournament()` call passes `court_count` through.

### Types

`CreateQuedadaInput` adds `court_count?: number`.  
`Quedada` type (extends `Tournament`) gains `court_count: number | null`.

---

## RotationPanel Changes

### Setup screen (before "Iniciar scoreboard")

- `courtCount` state is initialized from `quedada.court_count ?? 1` instead of always defaulting to 1.
- The court picker (1–6 buttons) remains editable — organizer can reduce if a court becomes unavailable on the day.
- A distribution preview banner appears below the picker:

```
2 canchas — 8 jugando, 4 esperando
```

Updates live as the organizer adjusts the court count.

### After starting

No changes — `initializeMatches()` already handles the distribution correctly.

---

## Error Handling

- If `max_participants` would drop below `courtCount × playersPerCourt` after a courts change, reset `max_participants` to the new minimum automatically (no error shown — silent correction with updated preview).
- If the organizer tries to start with fewer participants than `courtCount × playersPerCourt`, the "Iniciar scoreboard" button stays disabled with the existing warning message.

---

## Out of Scope

- Loading real court names from the `courts` table (number picker only)
- Multi-sport court count (always Pickleball for quedadas)
- Saving court count changes made in RotationPanel back to the DB (day-of adjustments are ephemeral)
