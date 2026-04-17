# Codebase Audit — Design Spec
_Date: 2026-04-17_

## Overview

Comprehensive three-phase audit of the MATCHPOINT codebase covering dead code removal,
API rate limit coverage, and RLS policy hardening. Phases are ordered by impact on
subsequent phases: cleaning first reduces noise, rate limiting covers the clean API,
RLS audit runs against the final state.

---

## Phase 1 — Dead Code Cleanup

### Scope

**Remove:**
- `src/features/penalties/` — empty directory (0 files), never implemented feature stub
- `src/components/ui/separator.tsx` — shadcn component with zero imports in the codebase

**Verify and keep:**
- `src/features/chat/` — actively used in 5 messages pages and 2 components
- `src/proxy.ts` — Next.js 16 middleware (replaces `middleware.ts`, named `proxy.ts` by convention)

### Approach

1. Delete `src/features/penalties/` directory
2. Delete `src/components/ui/separator.tsx`
3. Run `npx tsc --noEmit` to confirm zero type errors after removal
4. Commit: `chore(cleanup): remove dead code — penalties stub and unused separator`

### Success Criteria

- TypeScript compiles clean after removal
- `grep -r "penalties\|separator" src/` returns no imports (only file paths in test/non-src)

---

## Phase 2 — Rate Limit Coverage

### Context

Current state: **15 of 82 API routes** have rate limiting. 67 routes are unprotected.
The rate limiter is backed by Supabase RPC (`check_rate_limit`) — shared state across
all Vercel instances, sliding window, fails closed.

### New RATE_LIMITS profiles to add to `src/lib/rate-limit.ts`

| Key | Limit | Window | Rationale |
|-----|-------|--------|-----------|
| `quedadasCreate` | 10 | 1h | Prevent quedada spam per organizer |
| `quedadasMatch` | 60 | 1min | Score entry — high frequency, low risk |
| `notificationsRead` | 120 | 1min | Polling-friendly read limit |
| `adminSearch` | 30 | 1min | Admin search — generous but bounded |
| `adminSettings` | 10 | 1h | Settings changes — infrequent |
| `conversationsMarkRead` | 60 | 1min | Mark-read is fire-and-forget |
| `profileCheckUsername` | 20 | 1min | Autocomplete validation calls |
| `shopProductUpdate` | 20 | 1h | Product edits per seller |
| `shopOrderUpdate` | 20 | 1h | Order status transitions |
| `shopClubOrders` | 30 | 1min | Club order list reads |
| `shopClubProducts` | 30 | 1min | Club product list reads |

### Routes to protect by domain

**quedadas (2 routes):**
- `POST /api/quedadas` → `quedadasCreate`, identifier: `user.id`
- `POST /api/quedadas/[id]/rotation/match` → `quedadasMatch`, identifier: `user.id`

**shop (6 routes without coverage):**
- `GET/PATCH /api/shop/products/[id]` → `shopProductUpdate` on PATCH
- `GET/PATCH /api/shop/orders/[id]` → `shopOrderUpdate` on PATCH
- `POST /api/shop/orders/[id]/proof` → reuse existing `proofUpload`
- `POST /api/shop/products/[id]/approve` → reuse existing `adminBulk`
- `GET /api/shop/club/[clubId]/products` → `shopClubProducts`
- `GET /api/shop/club/[clubId]/orders` → `shopClubOrders`

**admin (16 routes without coverage):**
- `POST /api/admin/announcements` → reuse `adminBulk`
- `POST/DELETE /api/admin/bulk` → reuse `adminBulk`
- `GET /api/admin/search` → `adminSearch`
- `GET/PATCH /api/admin/settings` → `adminSettings` on PATCH
- `GET /api/admin/shop` → `adminSearch` (read-only listing)
- `GET/POST /api/admin/users` → `adminCreateUser` on POST (already exists)
- `GET/PATCH/DELETE /api/admin/users/[id]` → `adminCreateUser` on mutations
- `GET/POST /api/admin/users/[id]/badges` → `adminBulk` on POST
- `DELETE /api/admin/users/[id]/badges/[badgeId]` → `adminBulk`
- `GET/POST /api/admin/users/[id]/memberships` → `adminBulk` on POST
- `GET/POST/PATCH /api/admin/club-requests/[id]` → `clubRequests` already exists
- `GET/POST /api/admin/club-requests` → `clubRequests` already exists
- `GET/PATCH/DELETE /api/admin/tournaments/[id]` → `tournamentCreate` on mutations
- `GET/POST /api/admin/tournaments` → `tournamentCreate` on POST
- `GET/PATCH/DELETE /api/admin/clubs/[id]` → `adminBulk` on mutations
- `GET/POST /api/admin/clubs` → `adminBulk` on POST
- `GET/PATCH/DELETE /api/admin/events/[id]` → `eventsCreate` on mutations
- `GET/POST /api/admin/events` → `eventsCreate` on POST

**notifications (1 route):**
- `GET/POST /api/notifications` → `notificationsRead` on GET, `adminBulk` on POST

**conversations (1 route):**
- `POST /api/conversations/[id]/read` → `conversationsMarkRead`

**profile (2 routes):**
- `GET /api/profile/check-username` → `profileCheckUsername`
- `GET/PATCH /api/profile/settings` → `profileUpdate` on PATCH (already exists)

### Implementation pattern

All mutations use `user.id` as identifier (authenticated, more granular than IP).
Read-only endpoints use IP (`getClientIp(request)`) to protect against unauthenticated
enumeration.

Rate limit check always runs AFTER auth check — no point rate limiting unauthenticated
requests that already return 401.

```typescript
// Pattern for mutations (POST/PATCH/DELETE)
const rl = await checkRateLimit("quedadasCreate", ctx.user.id, RATE_LIMITS.quedadasCreate)
if (!rl.allowed) {
  return NextResponse.json(
    { success: false, data: null, error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
  )
}
```

### Commit
`feat(security): apply rate limits to all 67 unprotected API routes`

---

## Phase 3 — RLS Deep Audit

### Methodology

For each table, verify:
1. RLS is `ENABLED`
2. At least one `SELECT` policy exists for the appropriate role
3. At least one write (`INSERT`/`UPDATE`/`DELETE`) policy exists
4. `service_role` bypass policy exists (pattern used across all tables)
5. No overly permissive policies (e.g., `USING (true)` for `authenticated`)

### Tables requiring investigation

**quedadas (high risk):**
- `tournaments` policies check `event_type` implicitly — need to verify `quedada` rows
  are accessible to the organizer (creator) not just club managers
- `tournament_participants` policies — guest participants have `user_id IS NULL`,
  policies that join on `user_id` will silently exclude guest rows from organizer reads

**match_results:**
- Added in a mid-cycle migration. Verify SELECT policy allows tournament participants
  to read their own results, and that INSERT is restricted to organizers/managers.

**audit_log:**
- Must be insert-only for service role. No authenticated user should be able to
  SELECT audit logs (privacy) or DELETE them (integrity).

**notifications:**
- Verify users can only SELECT their own notifications (`user_id = auth.uid()`).
- INSERT restricted to service role only (notifications are system-generated).

### Deliverable

Migration `058_rls_audit_hardening.sql` containing:
- Any missing policies for the tables above
- Comments explaining each policy's intent
- No dropping of existing correct policies

### Success Criteria

- Every table has at least SELECT + INSERT policies covering the appropriate roles
- Guest participants in quedadas readable by organizer
- audit_log is deny-all for authenticated/anon direct access
- `058_rls_audit_hardening.sql` applies cleanly on a fresh DB

### Commit
`fix(security): RLS hardening — quedadas guest rows, audit_log deny, notifications isolation`

---

## Non-Goals

- No refactoring of API response shape
- No new features
- No changes to existing rate limit values (only adding new profiles)
- No dropping or replacing existing RLS policies (additive only)

---

## Testing

After each phase:
- `npx tsc --noEmit` — zero type errors
- `npm run build` — clean build
- Manual smoke test of protected route returning `429` after threshold
- Supabase migration applies without error on local instance
