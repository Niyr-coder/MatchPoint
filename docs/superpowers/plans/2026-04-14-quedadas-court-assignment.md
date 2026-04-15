# Quedadas — Court Assignment Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a court-count picker to the quedada wizard that shows a live "X activos · Y en espera" preview, saves the value to the DB, and pre-loads it in the RotationPanel before starting a session.

**Architecture:** `court_count` is added as a nullable integer column to `tournaments`, written in the wizard (Step 1), and read by `RotationPanel` to initialize `courtCount` state instead of defaulting to 1. The existing `initializeMatches()` distribution logic is unchanged.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase (PostgreSQL) · Zod · Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/057_court_count.sql` | Create | Add `court_count integer DEFAULT 1` to tournaments |
| `src/features/tournaments/types.ts` | Modify | Add `court_count` to `Tournament` + `CreateTournamentInput` |
| `src/features/organizer/types.ts` | Modify | Add `court_count` to `CreateQuedadaInput` |
| `src/app/api/quedadas/route.ts` | Modify | Add `court_count` to Zod schema + pass to createTournament |
| `src/features/tournaments/queries.ts` | Modify | Include `court_count` in `fullInsert` object |
| `src/features/organizer/components/QuedadaWizard.tsx` | Modify | Court picker, live preview, numeric max_participants |
| `src/features/organizer/components/QuedadaManagePanel.tsx` | Modify | Pass `court_count` prop to RotationPanel |
| `src/features/organizer/components/RotationPanel.tsx` | Modify | Accept courtCount prop, expand options to 1-6, add preview |
| `src/features/organizer/__tests__/rotation.test.ts` | Modify | Add edge-case tests for initializeMatches with 5-6 courts |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/057_court_count.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/057_court_count.sql
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS court_count integer DEFAULT 1;
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
npx supabase db push
```

Expected: migration applies without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/057_court_count.sql
git commit -m "feat(db): add court_count column to tournaments"
```

---

## Task 2: Type + API Updates

**Files:**
- Modify: `src/features/tournaments/types.ts`
- Modify: `src/features/organizer/types.ts`
- Modify: `src/app/api/quedadas/route.ts`
- Modify: `src/features/tournaments/queries.ts`

- [ ] **Step 1: Add `court_count` to Tournament type**

In `src/features/tournaments/types.ts`, add to the `Tournament` interface (after `start_time`):

```typescript
  court_count?: number | null
```

Add to `CreateTournamentInput` interface (after `game_dynamic`):

```typescript
  court_count?: number
```

- [ ] **Step 2: Add `court_count` to CreateQuedadaInput**

In `src/features/organizer/types.ts`, add to `CreateQuedadaInput` (after `is_public`):

```typescript
  court_count?: number
```

- [ ] **Step 3: Add `court_count` to API schema**

In `src/app/api/quedadas/route.ts`, add to `createQuedadaSchema` (after `is_public`):

```typescript
  court_count: z.number().int().min(1).max(6).optional().default(1),
```

And in the `createTournament` call inside the POST handler, add:

```typescript
  court_count: d.court_count,
```

The full call becomes:

```typescript
const quedada = await createTournament(ctx.userId, {
  name: d.name,
  sport: "pickleball",
  modality: d.modality,
  max_participants: d.max_participants,
  start_date: d.start_date,
  start_time: d.start_time,
  entry_fee: 0,
  club_id: d.club_id,
  event_type: "quedada",
  game_dynamic: d.game_dynamic,
  court_count: d.court_count,
})
```

- [ ] **Step 4: Pass `court_count` in queries.ts fullInsert**

In `src/features/tournaments/queries.ts`, inside `createTournament()`, update `fullInsert` to include:

```typescript
const fullInsert = {
  ...baseInsert,
  start_time: input.start_time,
  modality: input.modality,
  is_official: input.is_official ?? false,
  ...(input.event_type ? { event_type: input.event_type } : {}),
  ...(input.game_dynamic ? { game_dynamic: input.game_dynamic } : {}),
  ...(input.court_count != null ? { court_count: input.court_count } : {}),
  extras: input.extras ?? {},
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/tournaments/types.ts \
        src/features/organizer/types.ts \
        src/app/api/quedadas/route.ts \
        src/features/tournaments/queries.ts
git commit -m "feat(api): propagate court_count through types, schema, and query"
```

---

## Task 3: Add Tests for initializeMatches Edge Cases

**Files:**
- Modify: `src/features/organizer/__tests__/rotation.test.ts`

- [ ] **Step 1: Write failing tests for 5 and 6 court scenarios**

Add these test cases to `src/features/organizer/__tests__/rotation.test.ts`:

```typescript
describe("initializeMatches — extended court counts", () => {
  const makePlayer = (id: string) => ({
    id,
    tournament_id: "t1",
    user_id: id,
    status: "confirmed" as const,
    payment_status: "paid" as const,
    seed: null,
    registered_at: "",
    guest_name: null,
    guest_lastname: null,
    profiles: null,
  })

  it("fills 5 courts with 20 doubles players, 0 waiting", () => {
    const players = Array.from({ length: 20 }, (_, i) => makePlayer(`p${i}`))
    const { activeMatches, waitingQueue } = initializeMatches(players, 5, "Dobles")
    expect(activeMatches).toHaveLength(5)
    expect(waitingQueue).toHaveLength(0)
  })

  it("fills 5 courts with 22 doubles players, 2 waiting", () => {
    const players = Array.from({ length: 22 }, (_, i) => makePlayer(`p${i}`))
    const { activeMatches, waitingQueue } = initializeMatches(players, 5, "Dobles")
    expect(activeMatches).toHaveLength(5)
    expect(waitingQueue).toHaveLength(2)
  })

  it("fills 6 courts with 24 doubles players, 0 waiting", () => {
    const players = Array.from({ length: 24 }, (_, i) => makePlayer(`p${i}`))
    const { activeMatches, waitingQueue } = initializeMatches(players, 6, "Dobles")
    expect(activeMatches).toHaveLength(6)
    expect(waitingQueue).toHaveLength(0)
  })

  it("only fills courts that have enough players — 6 courts, 18 players fills 4 not 5", () => {
    const players = Array.from({ length: 18 }, (_, i) => makePlayer(`p${i}`))
    const { activeMatches, waitingQueue } = initializeMatches(players, 6, "Dobles")
    expect(activeMatches).toHaveLength(4)
    expect(waitingQueue).toHaveLength(2)
  })

  it("2 courts, 10 doubles players: 8 active, 2 waiting", () => {
    const players = Array.from({ length: 10 }, (_, i) => makePlayer(`p${i}`))
    const { activeMatches, waitingQueue } = initializeMatches(players, 2, "Dobles")
    expect(activeMatches).toHaveLength(2)
    expect(waitingQueue).toHaveLength(2)
  })

  it("4 courts, 16 doubles players: 16 active, 0 waiting", () => {
    const players = Array.from({ length: 16 }, (_, i) => makePlayer(`p${i}`))
    const { activeMatches, waitingQueue } = initializeMatches(players, 4, "Dobles")
    expect(activeMatches).toHaveLength(4)
    expect(waitingQueue).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — verify they pass (logic already correct)**

```bash
npx vitest run src/features/organizer/__tests__/rotation.test.ts
```

Expected: all new tests PASS (the `initializeMatches` function already handles this correctly).

- [ ] **Step 3: Commit**

```bash
git add src/features/organizer/__tests__/rotation.test.ts
git commit -m "test(organizer): add edge-case tests for 5-6 court distribution"
```

---

## Task 4: Wizard UI — Court Picker + Live Preview

**Files:**
- Modify: `src/features/organizer/components/QuedadaWizard.tsx`

- [ ] **Step 1: Update WizardForm type and initial state**

In `QuedadaWizard.tsx`, update the `WizardForm` interface: replace the `max_participants` fixed union with a plain `number`, and add `court_count`:

```typescript
interface WizardForm {
  name: string
  game_dynamic: GameDynamic | ""
  modality: string
  court_count: number
  max_participants: number
  start_date: string
  start_time: string
  club_id: string
  is_public: boolean
}
```

Update the initial state:

```typescript
const [form, setForm] = useState<WizardForm>({
  name: "",
  game_dynamic: "",
  modality: "",
  court_count: 1,
  max_participants: 4,
  start_date: "",
  start_time: "",
  club_id: clubs[0]?.id ?? "",
  is_public: false,
})
```

Add a helper constant at the top of the component (after MODALITIES):

```typescript
const COURT_OPTIONS = [1, 2, 3, 4, 5, 6] as const

function playersPerCourt(modality: string): number {
  return modality === "Dobles" || modality === "Mixtos" ? 4 : 2
}
```

- [ ] **Step 2: Keep max_participants in sync when courts or modality change**

Replace the `update` function with one that auto-adjusts `max_participants` when `court_count` or `modality` changes:

```typescript
function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
  setForm(prev => {
    const next = { ...prev, [key]: value }
    if (key === "court_count" || key === "modality") {
      const ppc = playersPerCourt(next.modality)
      const minMax = (next.court_count as number) * ppc
      if (next.max_participants < minMax) {
        next.max_participants = minMax
      }
    }
    return next
  })
}
```

- [ ] **Step 3: Replace max_participants fixed buttons with court picker + numeric input**

In Step 1 JSX, replace the entire "Máx. jugadores" section (the `MAX_PLAYERS.map(...)` block) with the following two sections. Insert the **court picker** right after the Modalidad section, then the **Máx. jugadores numeric input**:

```tsx
{/* Court picker */}
<div>
  <label className={labelCls}>Canchas disponibles</label>
  <div className="mt-2 flex gap-2">
    {COURT_OPTIONS.map(n => (
      <button
        key={n}
        type="button"
        onClick={() => update("court_count", n)}
        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-colors ${
          form.court_count === n
            ? "border-foreground bg-foreground text-white"
            : "border-border hover:border-foreground/50"
        }`}
      >
        {n}
      </button>
    ))}
  </div>
  {/* Live preview */}
  {form.modality && (
    <div className="mt-2 px-3 py-2 bg-muted rounded-xl text-xs text-zinc-500 font-medium">
      {(() => {
        const ppc = playersPerCourt(form.modality)
        const active = form.court_count * ppc
        const waiting = Math.max(0, form.max_participants - active)
        return `${form.court_count} cancha${form.court_count > 1 ? "s" : ""} × ${ppc} jugadores = ${active} activos${waiting > 0 ? ` · ${waiting} en espera` : ""}`
      })()}
    </div>
  )}
</div>

{/* Max participants — numeric input */}
<div>
  <label className={labelCls}>Máx. jugadores (total)</label>
  <input
    type="number"
    className={`${inputCls} mt-2`}
    min={form.modality ? form.court_count * playersPerCourt(form.modality) : 4}
    max={64}
    value={form.max_participants}
    onChange={e => {
      const val = Math.max(
        form.modality ? form.court_count * playersPerCourt(form.modality) : 4,
        Number(e.target.value)
      )
      update("max_participants", val)
    }}
  />
  {form.modality && (
    <p className="mt-1 text-[11px] text-zinc-400">
      Mínimo: {form.court_count * playersPerCourt(form.modality)} jugadores
    </p>
  )}
</div>
```

- [ ] **Step 4: Update Step 3 summary to include court info**

Find the summary section (step === 3) and update the second detail line:

```tsx
<div className="text-xs text-zinc-500">
  📅 {form.start_date} {form.start_time} · 👥 máx {form.max_participants} ·{" "}
  {form.court_count} cancha{form.court_count > 1 ? "s" : ""} ·{" "}
  {form.court_count * playersPerCourt(form.modality || "Singles")} activos
</div>
```

- [ ] **Step 5: Include court_count in the POST body**

In `handleSubmit`, add `court_count` to the fetch body:

```typescript
body: JSON.stringify({
  name: form.name,
  game_dynamic: form.game_dynamic,
  modality: form.modality,
  max_participants: form.max_participants,
  start_date: form.start_date,
  start_time: form.start_time,
  club_id: form.is_public ? undefined : form.club_id || undefined,
  is_public: form.is_public,
  court_count: form.court_count,
}),
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/organizer/components/QuedadaWizard.tsx
git commit -m "feat(wizard): add court picker and live distribution preview"
```

---

## Task 5: RotationPanel — Pre-load court_count + Expand Options

**Files:**
- Modify: `src/features/organizer/components/QuedadaManagePanel.tsx`
- Modify: `src/features/organizer/components/RotationPanel.tsx`

- [ ] **Step 1: Pass court_count from QuedadaManagePanel to RotationPanel**

In `src/features/organizer/components/QuedadaManagePanel.tsx`, update the RotationPanel usage (in the "Bracket / Resultados" tab):

```tsx
<RotationPanel
  quedadaId={quedada.id}
  dynamic={quedada.game_dynamic as "king_of_court" | "popcorn"}
  participants={participants}
  modality={quedada.modality ?? "Singles"}
  initialCourtCount={quedada.court_count ?? 1}
/>
```

- [ ] **Step 2: Update RotationPanel Props interface**

In `src/features/organizer/components/RotationPanel.tsx`, update the `Props` interface:

```typescript
interface Props {
  quedadaId: string
  dynamic: "king_of_court" | "popcorn"
  participants: QuedadaParticipant[]
  modality: string
  initialCourtCount: number
}
```

Update the function signature:

```typescript
export function RotationPanel({ quedadaId, dynamic, participants, modality, initialCourtCount }: Props) {
```

Update `COURT_OPTIONS` at the top of the file:

```typescript
const COURT_OPTIONS = [1, 2, 3, 4, 5, 6] as const
type CourtCount = (typeof COURT_OPTIONS)[number]
```

Update initial state of `courtCount`:

```typescript
const [courtCount, setCourtCount] = useState<CourtCount>(
  (COURT_OPTIONS.includes(initialCourtCount as CourtCount) ? initialCourtCount : 1) as CourtCount
)
```

- [ ] **Step 3: Add distribution preview to setup screen**

In the setup screen JSX (when `!initialized`), add a preview banner below the court picker buttons:

```tsx
{/* Distribution preview */}
<div className="px-3 py-2 bg-muted rounded-xl text-xs text-zinc-500 font-medium">
  {(() => {
    const size = teamSize(modality)
    const ppc = size * 2
    const active = courtCount * ppc
    const total = participants.length
    const waiting = Math.max(0, total - active)
    const courts = Math.min(courtCount, Math.floor(total / ppc))
    return courts > 0
      ? `${courts} cancha${courts > 1 ? "s" : ""} × ${ppc} jugadores = ${courts * ppc} activos · ${waiting} en espera`
      : `Se necesitan al menos ${ppc} jugadores por cancha`
  })()}
</div>
```

Place this **between** the court picker buttons row and the warning message (`participants.length < minPlayers`).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all organizer tests**

```bash
npx vitest run src/features/organizer/__tests__/rotation.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/organizer/components/QuedadaManagePanel.tsx \
        src/features/organizer/components/RotationPanel.tsx
git commit -m "feat(organizer): pre-load court count and add distribution preview to RotationPanel"
```

---

## Task 6: Deploy

- [ ] **Step 1: Push DB migration to production**

```bash
npx supabase db push
```

Expected: migration `057_court_count` applies without error.

- [ ] **Step 2: Push code to GitHub**

```bash
git push origin main
```

Expected: Vercel auto-deploy triggers.

- [ ] **Step 3: Smoke test the wizard**

1. Go to `/dashboard/organizer/new`
2. Step 1: pick Dobles + 2 canchas → preview shows "2 canchas × 4 jugadores = 8 activos"
3. Change max jugadores to 12 → preview shows "8 activos · 4 en espera"
4. Reduce canchas to 1 → max auto-bumps to 4 minimum
5. Complete wizard and verify the quedada is created

- [ ] **Step 4: Smoke test the manage panel**

1. Open a quedada that used the new wizard
2. Go to "Bracket / Resultados" tab → RotationPanel setup shows court count pre-loaded from the saved value
3. Adjust courts if needed, verify preview updates
4. Start scoreboard — distribution matches preview
