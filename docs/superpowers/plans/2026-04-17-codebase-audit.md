# Codebase Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and harden the MATCHPOINT codebase across three axes: remove dead code, apply rate limits to 67 unprotected API routes, and harden RLS policies for quedadas guest rows.

**Architecture:** Three sequential phases. Phase 1 shrinks the diff surface. Phase 2 applies rate limiting by domain group using the existing `checkRateLimit` + `RATE_LIMITS` infrastructure from `src/lib/rate-limit.ts`. Phase 3 adds a single Supabase migration that closes RLS gaps without dropping any existing policy.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgreSQL + RLS), `checkRateLimit` RPC, Zod

---

## Phase 1 — Dead Code Cleanup

### Task 1: Remove empty penalties feature and unused separator component

**Files:**
- Delete: `src/features/penalties/` (empty directory)
- Delete: `src/components/ui/separator.tsx`

- [ ] **Step 1: Verify penalties is truly empty**

```bash
ls src/features/penalties/
grep -r "features/penalties" src/ --include="*.ts" --include="*.tsx"
```

Expected: `ls` returns nothing. `grep` returns no matches.

- [ ] **Step 2: Verify separator has no imports**

```bash
grep -r "separator\|Separator" src/ --include="*.ts" --include="*.tsx" | grep -v "src/components/ui/separator.tsx"
```

Expected: zero matches (no file imports the component).

- [ ] **Step 3: Delete both**

```bash
rm -rf src/features/penalties
rm src/components/ui/separator.tsx
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors output.

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "chore(cleanup): remove empty penalties stub and unused separator component"
```

---

## Phase 2 — Rate Limit Coverage

### Task 2: Add new rate limit profiles

**Files:**
- Modify: `src/lib/rate-limit.ts` (add 11 new profiles to `RATE_LIMITS`)

- [ ] **Step 1: Add profiles at the end of the RATE_LIMITS object**

Open `src/lib/rate-limit.ts`. Locate the closing `} as const` of `RATE_LIMITS` and insert before it:

```typescript
  // Quedadas
  quedadasCreate:        { limit: 10, windowMs:  3_600_000 } satisfies RateLimitConfig,  // 10 nuevas quedadas/hora
  quedadasMatch:         { limit: 60, windowMs:     60_000 } satisfies RateLimitConfig,  // 60 scores/min (alta frecuencia)
  // Notifications
  notificationsRead:     { limit: 120, windowMs:    60_000 } satisfies RateLimitConfig,  // 120 lecturas/min (polling)
  notificationsUpdate:   { limit: 30,  windowMs:    60_000 } satisfies RateLimitConfig,  // 30 mark-read/min
  // Admin
  adminSearch:           { limit: 30,  windowMs:    60_000 } satisfies RateLimitConfig,  // 30 búsquedas/min
  adminSettings:         { limit: 10,  windowMs: 3_600_000 } satisfies RateLimitConfig,  // 10 cambios config/hora
  // Conversations
  conversationsMarkRead: { limit: 60,  windowMs:    60_000 } satisfies RateLimitConfig,  // 60 mark-read/min
  // Profile
  profileCheckUsername:  { limit: 20,  windowMs:    60_000 } satisfies RateLimitConfig,  // 20 validaciones/min
  profileSettings:       { limit: 10,  windowMs: 3_600_000 } satisfies RateLimitConfig,  // 10 cambios settings/hora
  // Shop
  shopProductUpdate:     { limit: 20,  windowMs: 3_600_000 } satisfies RateLimitConfig,  // 20 edits/hora
  shopOrderUpdate:       { limit: 20,  windowMs: 3_600_000 } satisfies RateLimitConfig,  // 20 actualizaciones/hora
  shopClubRead:          { limit: 60,  windowMs:    60_000 } satisfies RateLimitConfig,  // 60 listados/min
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat(rate-limit): add 12 new profiles for quedadas, shop, admin, notifications"
```

---

### Task 3: Rate limit quedadas routes

**Files:**
- Modify: `src/app/api/quedadas/route.ts`
- Modify: `src/app/api/quedadas/[id]/rotation/match/route.ts`

- [ ] **Step 1: Protect POST /api/quedadas**

In `src/app/api/quedadas/route.ts`, add the import at the top:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

Inside `POST`, after the `canOrganize` check and before the JSON parsing:

```typescript
  const rl = await checkRateLimit("quedadasCreate", ctx.userId, RATE_LIMITS.quedadasCreate)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas quedadas creadas. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 2: Protect POST /api/quedadas/[id]/rotation/match**

In `src/app/api/quedadas/[id]/rotation/match/route.ts`, add import:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

After the `quedada.created_by !== user.id` check and before `let raw`:

```typescript
  const rl = await checkRateLimit("quedadasMatch", user.id, RATE_LIMITS.quedadasMatch)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quedadas/route.ts src/app/api/quedadas/\[id\]/rotation/match/route.ts
git commit -m "feat(security): rate limit quedadas create and rotation match endpoints"
```

---

### Task 4: Rate limit notifications and conversations

**Files:**
- Modify: `src/app/api/notifications/route.ts`
- Modify: `src/app/api/conversations/[id]/read/route.ts`

- [ ] **Step 1: Protect GET and PATCH /api/notifications**

In `src/app/api/notifications/route.ts`, add import after existing imports:

```typescript
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit"
```

In the `GET` handler, after the `if (authError || !user)` check:

```typescript
  const rl = await checkRateLimit("notificationsRead", user.id, RATE_LIMITS.notificationsRead)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

In the `PATCH` handler, after the `if (authError || !user)` check:

```typescript
  const rlPatch = await checkRateLimit("notificationsUpdate", user.id, RATE_LIMITS.notificationsUpdate)
  if (!rlPatch.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rlPatch.retryAfterSeconds) } }
    )
  }
```

Note: The `GET` function signature is `(request: NextRequest)` — the request parameter is already named `_request`. Change it to `request` to pass to `getClientIp` if needed, but since the user is authenticated we use `user.id` instead.

- [ ] **Step 2: Protect POST /api/conversations/[id]/read**

In `src/app/api/conversations/[id]/read/route.ts`, add import:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

After the `if (!user)` check:

```typescript
  const rl = await checkRateLimit("conversationsMarkRead", user.id, RATE_LIMITS.conversationsMarkRead)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/notifications/route.ts src/app/api/conversations/\[id\]/read/route.ts
git commit -m "feat(security): rate limit notifications and conversation read endpoints"
```

---

### Task 5: Rate limit profile endpoints

**Files:**
- Modify: `src/app/api/profile/check-username/route.ts`
- Modify: `src/app/api/profile/settings/route.ts`

- [ ] **Step 1: Protect GET /api/profile/check-username**

In `src/app/api/profile/check-username/route.ts`, add to existing imports:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

After the `if (!user)` check:

```typescript
  const rl = await checkRateLimit("profileCheckUsername", user.id, RATE_LIMITS.profileCheckUsername)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 2: Protect PATCH /api/profile/settings**

In `src/app/api/profile/settings/route.ts`, add to existing imports:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

Find the `PATCH` handler (it returns 401 if no user). After the `if (!user)` check inside PATCH:

```typescript
  const rl = await checkRateLimit("profileSettings", user.id, RATE_LIMITS.profileSettings)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas actualizaciones. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/profile/check-username/route.ts src/app/api/profile/settings/route.ts
git commit -m "feat(security): rate limit profile check-username and settings endpoints"
```

---

### Task 6: Rate limit shop endpoints

**Files:**
- Modify: `src/app/api/shop/products/[id]/route.ts`
- Modify: `src/app/api/shop/products/[id]/approve/route.ts`
- Modify: `src/app/api/shop/orders/[id]/route.ts`
- Modify: `src/app/api/shop/orders/[id]/proof/route.ts`
- Modify: `src/app/api/shop/club/[clubId]/products/route.ts`
- Modify: `src/app/api/shop/club/[clubId]/orders/route.ts`

- [ ] **Step 1: Read each file to understand current auth patterns**

```bash
head -5 src/app/api/shop/products/\[id\]/route.ts
head -5 src/app/api/shop/products/\[id\]/approve/route.ts
head -5 src/app/api/shop/orders/\[id\]/route.ts
head -5 src/app/api/shop/orders/\[id\]/proof/route.ts
head -5 src/app/api/shop/club/\[clubId\]/products/route.ts
head -5 src/app/api/shop/club/\[clubId\]/orders/route.ts
```

- [ ] **Step 2: Add import and rate limit to shop/products/[id]/route.ts**

Add import:
```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

In the `PUT` (or `PATCH`) handler, after the auth check and before the `canManageProduct` call:

```typescript
  const rl = await checkRateLimit("shopProductUpdate", ctx.userId, RATE_LIMITS.shopProductUpdate)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas actualizaciones. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 3: Rate limit shop/products/[id]/approve/route.ts**

Add import:
```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

After auth check, use existing `adminBulk` profile (approve is an admin action):

```typescript
  const rl = await checkRateLimit("adminBulk", ctx.userId, RATE_LIMITS.adminBulk)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 4: Rate limit shop/orders/[id]/route.ts (mutations only)**

Add import:
```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

In `PATCH`/`PUT` handler, after auth check:

```typescript
  const rl = await checkRateLimit("shopOrderUpdate", ctx.userId, RATE_LIMITS.shopOrderUpdate)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas actualizaciones. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 5: Rate limit shop/orders/[id]/proof/route.ts**

Add import:
```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

After auth check, reuse existing `proofUpload`:

```typescript
  const rl = await checkRateLimit("proofUpload", ctx.userId, RATE_LIMITS.proofUpload)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas subidas. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 6: Rate limit shop/club/[clubId]/products and orders (read-heavy)**

In both `shop/club/[clubId]/products/route.ts` and `shop/club/[clubId]/orders/route.ts`, add import and rate limit GET with `shopClubRead`:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

After auth check in GET:

```typescript
  const rl = await checkRateLimit("shopClubRead", ctx.userId, RATE_LIMITS.shopClubRead)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/shop/
git commit -m "feat(security): rate limit all shop endpoints"
```

---

### Task 7: Rate limit admin endpoints

**Files:**
- Modify: `src/app/api/admin/announcements/route.ts`
- Modify: `src/app/api/admin/bulk/route.ts`
- Modify: `src/app/api/admin/search/route.ts`
- Modify: `src/app/api/admin/settings/route.ts`
- Modify: `src/app/api/admin/shop/route.ts`
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/api/admin/users/[id]/badges/route.ts`
- Modify: `src/app/api/admin/users/[id]/badges/[badgeId]/route.ts`
- Modify: `src/app/api/admin/users/[id]/memberships/route.ts`
- Modify: `src/app/api/admin/club-requests/route.ts`
- Modify: `src/app/api/admin/club-requests/[id]/route.ts`
- Modify: `src/app/api/admin/tournaments/route.ts`
- Modify: `src/app/api/admin/tournaments/[id]/route.ts`
- Modify: `src/app/api/admin/clubs/route.ts`
- Modify: `src/app/api/admin/clubs/[id]/route.ts`
- Modify: `src/app/api/admin/events/route.ts`
- Modify: `src/app/api/admin/events/[id]/route.ts`

**Rate limit assignment by route:**

| Route | HTTP verbs | Profile |
|-------|-----------|---------|
| `admin/announcements` | POST | `adminBulk` |
| `admin/bulk` | POST | `adminBulk` |
| `admin/search` | GET | `adminSearch` |
| `admin/settings` | PATCH | `adminSettings` |
| `admin/shop` | GET | `adminSearch` |
| `admin/users` | POST | `adminCreateUser` |
| `admin/users/[id]` | PATCH/DELETE | `adminCreateUser` |
| `admin/users/[id]/badges` | POST | `adminBulk` |
| `admin/users/[id]/badges/[badgeId]` | DELETE | `adminBulk` |
| `admin/users/[id]/memberships` | POST | `adminBulk` |
| `admin/club-requests` | GET | `adminSearch` |
| `admin/club-requests/[id]` | PATCH | `adminBulk` |
| `admin/tournaments` | POST | `tournamentCreate` |
| `admin/tournaments/[id]` | PATCH/DELETE | `tournamentCreate` |
| `admin/clubs` | POST | `adminBulk` |
| `admin/clubs/[id]` | PATCH/DELETE | `adminBulk` |
| `admin/events` | POST | `eventsCreate` |
| `admin/events/[id]` | PATCH/DELETE | `eventsCreate` |

- [ ] **Step 1: Read each file to find the auth check pattern**

```bash
for f in src/app/api/admin/announcements/route.ts \
  src/app/api/admin/bulk/route.ts \
  src/app/api/admin/search/route.ts \
  src/app/api/admin/settings/route.ts; do
  echo "=== $f ===" && head -30 "$f"
done
```

- [ ] **Step 2: Apply the import to every admin file**

For each of the 18 admin route files listed above, add this import if not already present:

```typescript
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
```

- [ ] **Step 3: Apply rate limits — mutation handlers only (POST/PATCH/DELETE)**

Pattern for every mutation handler, inserted after the ADMIN role check and before body parsing:

```typescript
const rl = await checkRateLimit("<profile>", ctx.userId, RATE_LIMITS.<profile>)
if (!rl.allowed) {
  return NextResponse.json(
    { success: false, data: null, error: "Demasiadas solicitudes. Intenta más tarde." },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
  )
}
```

Use the profile from the assignment table above for each route.

- [ ] **Step 4: Apply rate limits — read handlers (GET)**

For `admin/search` GET and `admin/shop` GET, use `adminSearch`. For `admin/club-requests` GET, use `adminSearch`. Insert after the ADMIN role check:

```typescript
const rl = await checkRateLimit("adminSearch", ctx.userId, RATE_LIMITS.adminSearch)
if (!rl.allowed) {
  return NextResponse.json(
    { success: false, data: null, error: "Demasiadas solicitudes" },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat(security): rate limit all 18 admin API endpoints"
```

---

## Phase 3 — RLS Deep Audit

### Task 8: Audit tournament_participants guest row access

**Context:**  
The existing `tp_insert_own` policy has `WITH CHECK (user_id = auth.uid())`. When a guest participant is added (`user_id IS NULL`), this check evaluates to `NULL = auth.uid()` which is **false** in PostgreSQL. Guest inserts work today only because `POST /api/tournaments/[id]/participants` uses `createServiceClient()` (service_role bypasses RLS). This is correct behavior, but needs a comment in the migration to prevent future engineers from accidentally switching to the auth client for guest inserts.

The `tp_update_own` policy has `USING (user_id = auth.uid())` — same issue for guest rows. Organizer update of guest rows must also go through service_role.

**Files:**
- Create: `supabase/migrations/058_rls_audit_hardening.sql`

- [ ] **Step 1: Check current tournament_participants policies in full**

```bash
grep -A 8 "tp_insert_own\|tp_update_own\|tp_select\|tp_service" supabase/migrations/004_courts_reservations_tournaments.sql
```

Expected output shows:
- `tp_select`: `USING (true)` — all authenticated can read all participants ✓
- `tp_insert_own`: `WITH CHECK (user_id = auth.uid())` — blocks guest inserts from auth role ✓ (intentional)
- `tp_update_own`: `USING (user_id = auth.uid())` — blocks guest updates from auth role ✓ (intentional)
- `tp_service`: `FOR ALL TO service_role USING (true)` — service role unrestricted ✓

- [ ] **Step 2: Verify organizer can read guest participants**

The `tp_select` policy is `USING (true)` — all authenticated users can read all participants. This correctly allows the organizer to see guest participants in their quedada. **No change needed here.**

- [ ] **Step 3: Check audit_log policies**

```bash
grep -A 6 "audit_log" supabase/migrations/*.sql | grep -i "policy\|using\|check" | head -20
```

Expected: `audit_log_select_admin` (ADMIN-only SELECT) + `audit_log_service_role` (ALL service_role). **Correctly locked down — no change needed.**

- [ ] **Step 4: Verify notifications INSERT is blocked for authenticated**

```bash
grep -A 6 "notifications" supabase/migrations/026_notifications_teams.sql | grep -i "policy\|insert"
```

Expected: no INSERT policy for `authenticated` role — only service_role can insert. **Correct — no change needed.**

- [ ] **Step 5: Create migration 058 with comments and one fix**

The only real fix needed: `tournament_brackets` `brackets_select` policy allows all authenticated to read all brackets — this is fine for public tournaments but should explicitly note it covers quedada brackets too (organizer can read their game scores). No new policy needed, add explanatory comment.

Create `supabase/migrations/058_rls_audit_hardening.sql`:

```sql
-- Migration 058: RLS audit hardening
--
-- Findings from 2026-04-17 audit:
--
-- 1. tournament_participants — guest rows (user_id IS NULL):
--    - tp_insert_own: WITH CHECK (user_id = auth.uid()) intentionally blocks
--      guest inserts from the authenticated role. Guest participants MUST be
--      inserted via service_role (createServiceClient). This is already the
--      pattern in POST /api/tournaments/[id]/participants.
--    - tp_update_own: USING (user_id = auth.uid()) intentionally blocks guest
--      updates from the authenticated role. Guest row updates MUST use service_role.
--    - tp_select: USING (true) — all authenticated can read all participants,
--      including guest rows. Organizer correctly sees guests in their quedada.
--    ACTION: No policy changes needed. Comment added for future engineers.
--
-- 2. audit_log — correctly locked: SELECT only for admin, ALL for service_role.
--    No authenticated user can INSERT, UPDATE, or DELETE audit log entries directly.
--    ACTION: None.
--
-- 3. notifications — correctly locked: SELECT + UPDATE for owner (auth.uid() = user_id),
--    ALL for service_role, no INSERT for authenticated.
--    ACTION: None.
--
-- 4. tournament_brackets — brackets_select USING (true) covers both regular
--    tournament brackets and quedada rotation history (round=0 rows). Correct.
--    ACTION: None.
--
-- 5. quedada organizer UPDATE on own tournament:
--    tournaments_update_own: USING (created_by = auth.uid()) — organizer can
--    update their own tournament/quedada row. Correct.
--    ACTION: None.
--
-- ACTUAL CHANGE: Add explicit organizer-scoped DELETE policy for quedada
-- participants, so organizers can remove guests via auth client without needing
-- service_role for this specific operation.
-- (Currently organizer cannot DELETE a guest participant they mistakenly added
-- via any auth-client call — they need service_role or a backend route.)

-- Allow organizer to delete participants from their own quedada/tournament
-- This covers removing a mistakenly added guest (user_id IS NULL won't match
-- user_id = auth.uid(), so we check tournament ownership instead).
DROP POLICY IF EXISTS "tp_delete_organizer" ON public.tournament_participants;

CREATE POLICY "tp_delete_organizer"
  ON public.tournament_participants
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND t.created_by = auth.uid()
    )
  );

-- Service role catch-all (already exists via tp_service but document explicitly)
-- No change — tp_service FOR ALL TO service_role USING (true) already covers DELETE.
```

- [ ] **Step 6: TypeScript check and build**

```bash
npx tsc --noEmit
```

Expected: no errors (migration is SQL only, no TS changes).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/058_rls_audit_hardening.sql
git commit -m "fix(security): RLS audit — document guest row intent, add organizer delete policy for participants"
```

---

## Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean build, no type errors or warnings.

- [ ] **Step 3: Verify rate limit coverage**

```bash
grep -rL "checkRateLimit\|RATE_LIMITS" src/app/api/ --include="route.ts" | grep -v "__tests__"
```

Expected: only GET-only, low-risk or auth-callback routes remain without rate limiting (e.g., `/api/auth/callback`).

- [ ] **Step 4: Verify dead code removed**

```bash
ls src/features/penalties/ 2>&1   # should say "No such file or directory"
ls src/components/ui/separator.tsx 2>&1  # should say "No such file or directory"
```

- [ ] **Step 5: Verify migration file exists**

```bash
ls -la supabase/migrations/058_rls_audit_hardening.sql
```

Expected: file exists, non-zero size.
