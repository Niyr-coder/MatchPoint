# Player Permissions & Badges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins and club managers to grant badges to players from the `UserDetailPanel` sidebar; each badge automatically grants `AppPermission`s and is visible on the player's profile, dashboard, and ranking.

**Architecture:** New `player_badges` table stores badge grants (global or club-scoped). Badge-to-permission mapping lives in a TypeScript constant. Server-side queries merge badge permissions into the auth context. Admin Client Component (`BadgesSection`) calls dedicated API routes; player-facing surfaces are Server Components that query badges directly.

**Tech Stack:** Next.js 16 App Router · Supabase (PostgreSQL + service client) · Zod · TypeScript · Tailwind CSS 4 · Vitest

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/054_player_badges.sql` | Table, indexes, RLS |
| Create | `src/features/badges/constants.ts` | Badge config + permission map |
| Create | `src/features/badges/types.ts` | `BadgeType`, `PlayerBadge` interfaces |
| Modify | `src/features/auth/types.ts` | Extend `AuthContext` with `badges[]` |
| Create | `src/features/badges/queries.ts` | Server-side `getPlayerBadges(userId)` |
| Create | `src/app/api/admin/users/[id]/badges/route.ts` | Admin GET + POST |
| Create | `src/app/api/admin/users/[id]/badges/[badgeId]/route.ts` | Admin DELETE |
| Create | `src/app/api/club/[clubId]/members/[id]/badges/route.ts` | Club POST + DELETE |
| Create | `src/components/admin/user-detail/BadgesSection.tsx` | Admin sidebar section |
| Modify | `src/lib/admin/queries/types.ts` | Add `badges` field to `UserAdmin` |
| Modify | `src/lib/admin/queries/users.ts` | Fetch badges alongside user list |
| Modify | `src/components/admin/user-detail/UserDetailPanel.tsx` | Insert `BadgesSection` |
| Create | `src/features/badges/components/MyBadgesSection.tsx` | Player dashboard section |
| Modify | `src/app/(dashboard)/dashboard/page.tsx` | Add MyBadgesSection |
| Modify | `src/features/users/components/PlayerHeroSection.tsx` | Show badges on public profile |
| Modify | `src/app/(dashboard)/dashboard/players/[username]/page.tsx` | Fetch + pass badges |
| Modify | `src/features/ratings/types.ts` | Add `badges` to `RankingEntry` |
| Modify | `src/features/ratings/queries.ts` | Fetch + merge badges into ranking |
| Modify | `src/features/ratings/components/RankingView.tsx` | Render badge icons |
| Create | `src/features/badges/__tests__/constants.test.ts` | Unit tests for badge config |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/054_player_badges.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/054_player_badges.sql

CREATE TABLE IF NOT EXISTS public.player_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  club_id    UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_badges_unique UNIQUE (user_id, badge_type, club_id)
);

CREATE INDEX IF NOT EXISTS idx_player_badges_user_id ON public.player_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_club_id  ON public.player_badges(club_id) WHERE club_id IS NOT NULL;

ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

-- Users can read their own badges
CREATE POLICY "player_badges_read_own"
  ON public.player_badges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all badges (used for admin panel queries via service role)
-- Service role bypasses RLS — no policy needed for service client writes.

-- Public read so profile pages can show badges
CREATE POLICY "player_badges_read_public"
  ON public.player_badges FOR SELECT TO authenticated
  USING (true);
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
npx supabase db push
```

Expected: migration applies without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/054_player_badges.sql
git commit -m "feat(db): add player_badges table with RLS"
```

---

## Task 2: Types & Constants

**Files:**
- Create: `src/features/badges/constants.ts`
- Create: `src/features/badges/types.ts`
- Modify: `src/features/auth/types.ts`
- Create: `src/features/badges/__tests__/constants.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/badges/__tests__/constants.test.ts
import { describe, it, expect } from "vitest"
import { BADGE_CONFIG, BADGE_PERMISSION_MAP, BADGE_TYPES } from "../constants"

describe("BADGE_TYPES", () => {
  it("contains all 5 badge keys", () => {
    expect(BADGE_TYPES).toEqual(
      expect.arrayContaining([
        "organizador_verificado", "vip", "arbitro", "embajador", "capitan",
      ])
    )
    expect(BADGE_TYPES).toHaveLength(5)
  })
})

describe("BADGE_CONFIG", () => {
  it("every badge type has an emoji, label, and color", () => {
    for (const type of BADGE_TYPES) {
      expect(BADGE_CONFIG[type].emoji).toBeTruthy()
      expect(BADGE_CONFIG[type].label).toBeTruthy()
      expect(BADGE_CONFIG[type].color).toBeTruthy()
    }
  })
})

describe("BADGE_PERMISSION_MAP", () => {
  it("organizador_verificado grants tournaments.create", () => {
    expect(BADGE_PERMISSION_MAP.organizador_verificado).toContain("tournaments.create")
  })
  it("vip grants shop.purchase", () => {
    expect(BADGE_PERMISSION_MAP.vip).toContain("shop.purchase")
  })
  it("arbitro grants reservations.checkin", () => {
    expect(BADGE_PERMISSION_MAP.arbitro).toContain("reservations.checkin")
  })
  it("embajador grants users.view", () => {
    expect(BADGE_PERMISSION_MAP.embajador).toContain("users.view")
  })
  it("capitan grants team.manage", () => {
    expect(BADGE_PERMISSION_MAP.capitan).toContain("team.manage")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/badges/__tests__/constants.test.ts
```

Expected: FAIL with "Cannot find module '../constants'"

- [ ] **Step 3: Create `src/features/badges/constants.ts`**

```typescript
import type { AppPermission } from "@/features/auth/types"

export const BADGE_TYPES = [
  "organizador_verificado",
  "vip",
  "arbitro",
  "embajador",
  "capitan",
] as const

export type BadgeType = (typeof BADGE_TYPES)[number]

export interface BadgeConfig {
  label: string
  emoji: string
  /** Tailwind background + border + text classes for the badge chip */
  color: string
  /** Whether this badge can have a club_id (false = always global) */
  canBeClubScoped: boolean
  /** Whether only ADMIN can grant it (true) or also OWNER/MANAGER (false) */
  adminOnly: boolean
}

export const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  organizador_verificado: {
    label: "Organizador Verificado",
    emoji: "🏆",
    color: "bg-green-50 border-green-200 text-green-800",
    canBeClubScoped: true,
    adminOnly: true,
  },
  vip: {
    label: "Jugador VIP",
    emoji: "👑",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    canBeClubScoped: false,
    adminOnly: true,
  },
  arbitro: {
    label: "Árbitro",
    emoji: "⚖️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    canBeClubScoped: true,
    adminOnly: false,
  },
  embajador: {
    label: "Embajador del Club",
    emoji: "⭐",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    canBeClubScoped: true,
    adminOnly: false,
  },
  capitan: {
    label: "Capitán de Equipo",
    emoji: "🎯",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    canBeClubScoped: true,
    adminOnly: false,
  },
}

export const BADGE_PERMISSION_MAP: Record<BadgeType, AppPermission[]> = {
  organizador_verificado: ["tournaments.create", "tournaments.manage", "tournaments.view"],
  vip:                    ["reservations.create", "shop.purchase"],
  arbitro:                ["tournaments.view", "reservations.checkin"],
  embajador:              ["users.view", "leaderboard.view", "reports.view_limited"],
  capitan:                ["team.manage", "reservations.create"],
}

/** Club-scoped badge types (can be granted by OWNER/MANAGER) */
export const CLUB_BADGE_TYPES: BadgeType[] = BADGE_TYPES.filter(
  (t) => !BADGE_CONFIG[t].adminOnly
)
```

- [ ] **Step 4: Create `src/features/badges/types.ts`**

```typescript
import type { BadgeType } from "@/features/badges/constants"

export interface PlayerBadge {
  id: string
  badge_type: BadgeType
  club_id: string | null
  club_name: string | null
  granted_by: string
  granted_at: string
}
```

- [ ] **Step 5: Extend `src/features/auth/types.ts`**

Add `PlayerBadge` import and `badges` field to `AuthContext`. Replace the existing `AuthContext` interface:

```typescript
// At top of file, add import:
import type { PlayerBadge } from "@/features/badges/types"

// Extend AuthContext (add badges field):
export interface AuthContext {
  userId: string
  profile: Profile
  globalRole: AppRole
  clubId: string | null
  clubRole: AppRole | null
  permissions: AppPermission[]
  badges: PlayerBadge[]   // ← ADD THIS
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run src/features/badges/__tests__/constants.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/features/badges/ src/features/auth/types.ts
git commit -m "feat(badges): types, constants, and permission map"
```

---

## Task 3: Server-side Badges Query

**Files:**
- Create: `src/features/badges/queries.ts`

- [ ] **Step 1: Create the query function**

```typescript
// src/features/badges/queries.ts
import { createServiceClient } from "@/lib/supabase/server"
import type { PlayerBadge } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"

interface RawBadgeRow {
  id: string
  badge_type: string
  club_id: string | null
  granted_by: string
  granted_at: string
  clubs: { name: string } | null
}

/**
 * Returns all badges for a user (global + club-scoped).
 * Optionally filter to include only global or a specific club.
 */
export async function getPlayerBadges(userId: string): Promise<PlayerBadge[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })

  if (error || !data) return []

  return (data as RawBadgeRow[]).map((row) => ({
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }))
}

/**
 * Returns badges for multiple users keyed by userId.
 * Used by ranking to batch-fetch badges.
 */
export async function getBadgesByUserIds(
  userIds: string[]
): Promise<Record<string, PlayerBadge[]>> {
  if (userIds.length === 0) return {}

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id, granted_by, granted_at, user_id, clubs(name)")
    .in("user_id", userIds)

  if (error || !data) return {}

  const result: Record<string, PlayerBadge[]> = {}
  for (const row of data as (RawBadgeRow & { user_id: string })[]) {
    const entry: PlayerBadge = {
      id: row.id,
      badge_type: row.badge_type as BadgeType,
      club_id: row.club_id,
      club_name: row.clubs?.name ?? null,
      granted_by: row.granted_by,
      granted_at: row.granted_at,
    }
    ;(result[row.user_id] ??= []).push(entry)
  }
  return result
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/badges/queries.ts
git commit -m "feat(badges): server-side query helpers"
```

---

## Task 4: Admin API — GET + POST badges

**Files:**
- Create: `src/app/api/admin/users/[id]/badges/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/admin/users/[id]/badges/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import { BADGE_TYPES, BADGE_CONFIG } from "@/features/badges/constants"
import type { ApiResponse } from "@/types"
import type { PlayerBadge } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"

type RouteContext = { params: Promise<{ id: string }> }

interface RawBadgeRow {
  id: string
  badge_type: string
  club_id: string | null
  granted_by: string
  granted_at: string
  clubs: { name: string } | null
}

// ── GET — list badges for a user ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge[]>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .eq("user_id", id)
    .order("granted_at", { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, data: null, error: "Error al obtener insignias" }, { status: 500 })
  }

  const badges: PlayerBadge[] = (data as RawBadgeRow[]).map((row) => ({
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }))

  return NextResponse.json({ success: true, data: badges, error: null })
}

// ── POST — grant a badge ──────────────────────────────────────

const grantSchema = z.object({
  badge_type: z.enum(BADGE_TYPES),
  club_id: z.string().uuid().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, data: null, error: "Cuerpo inválido" }, { status: 400 }) }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: parsed.error.issues[0].message }, { status: 422 })
  }

  const { badge_type, club_id } = parsed.data
  const config = BADGE_CONFIG[badge_type]

  // VIP is always global — ignore any club_id
  const resolvedClubId = config.canBeClubScoped ? (club_id ?? null) : null

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .insert({
      user_id: id,
      badge_type,
      club_id: resolvedClubId,
      granted_by: authResult.context.userId,
    })
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: false, data: null, error: "El jugador ya tiene esta insignia" }, { status: 409 })
    }
    return NextResponse.json({ success: false, data: null, error: "Error al otorgar insignia" }, { status: 500 })
  }

  const row = data as RawBadgeRow
  const badge: PlayerBadge = {
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }

  await logAdminAction({
    action: "badge.granted",
    entityType: "users",
    entityId: id,
    actorId: authResult.context.userId,
    details: { badge_type, club_id: resolvedClubId },
  })

  return NextResponse.json({ success: true, data: badge, error: null })
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/[id]/badges/route.ts
git commit -m "feat(api): admin GET + POST /users/[id]/badges"
```

---

## Task 5: Admin API — DELETE badge

**Files:**
- Create: `src/app/api/admin/users/[id]/badges/[badgeId]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/admin/users/[id]/badges/[badgeId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { logAdminAction } from "@/lib/audit/log"
import type { ApiResponse } from "@/types"

type RouteContext = { params: Promise<{ id: string; badgeId: string }> }

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const authResult = await authorize({ requiredRoles: ["admin"] })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  const { id, badgeId } = await params
  const supabase = createServiceClient()

  // Confirm the badge belongs to this user before deleting
  const { data: existing } = await supabase
    .from("player_badges")
    .select("id, badge_type, club_id")
    .eq("id", badgeId)
    .eq("user_id", id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Insignia no encontrada" }, { status: 404 })
  }

  const { error } = await supabase.from("player_badges").delete().eq("id", badgeId)

  if (error) {
    return NextResponse.json({ success: false, data: null, error: "Error al revocar insignia" }, { status: 500 })
  }

  await logAdminAction({
    action: "badge.revoked",
    entityType: "users",
    entityId: id,
    actorId: authResult.context.userId,
    details: { badge_type: existing.badge_type, club_id: existing.club_id },
  })

  return NextResponse.json({ success: true, data: null, error: null })
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/[id]/badges/[badgeId]/route.ts
git commit -m "feat(api): admin DELETE /users/[id]/badges/[badgeId]"
```

---

## Task 6: Club API — POST + DELETE badges

**Files:**
- Create: `src/app/api/club/[clubId]/members/[id]/badges/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/club/[clubId]/members/[id]/badges/route.ts
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authorize } from "@/features/auth/queries"
import { createServiceClient } from "@/lib/supabase/server"
import { CLUB_BADGE_TYPES } from "@/features/badges/constants"
import type { ApiResponse } from "@/types"
import type { PlayerBadge } from "@/features/badges/types"
import type { BadgeType } from "@/features/badges/constants"

type RouteContext = { params: Promise<{ clubId: string; id: string }> }

interface RawBadgeRow {
  id: string
  badge_type: string
  club_id: string | null
  granted_by: string
  granted_at: string
  clubs: { name: string } | null
}

const grantSchema = z.object({
  badge_type: z.enum(CLUB_BADGE_TYPES as [string, ...string[]]),
})

// ── POST — grant a club-scoped badge ──────────────────────────

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<PlayerBadge>>> {
  const { clubId, id } = await params

  // Must be OWNER or MANAGER of this club (managers.manage = club.edit covers it)
  const authResult = await authorize({ clubId, requiredPermission: "club.edit" })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, data: null, error: "Cuerpo inválido" }, { status: 400 }) }

  const parsed = grantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, error: parsed.error.issues[0].message }, { status: 422 })
  }

  const { badge_type } = parsed.data
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("player_badges")
    .insert({
      user_id: id,
      badge_type,
      club_id: clubId,
      granted_by: authResult.context.userId,
    })
    .select("id, badge_type, club_id, granted_by, granted_at, clubs(name)")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: false, data: null, error: "El jugador ya tiene esta insignia en este club" }, { status: 409 })
    }
    return NextResponse.json({ success: false, data: null, error: "Error al otorgar insignia" }, { status: 500 })
  }

  const row = data as RawBadgeRow
  const badge: PlayerBadge = {
    id: row.id,
    badge_type: row.badge_type as BadgeType,
    club_id: row.club_id,
    club_name: row.clubs?.name ?? null,
    granted_by: row.granted_by,
    granted_at: row.granted_at,
  }

  return NextResponse.json({ success: true, data: badge, error: null })
}

// ── DELETE — revoke a club-scoped badge ───────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse<ApiResponse<null>>> {
  const { clubId, id } = await params

  const authResult = await authorize({ clubId, requiredPermission: "club.edit" })
  if (!authResult.ok) {
    return NextResponse.json({ success: false, data: null, error: "No autorizado" }, { status: 403 })
  }

  const url = new URL(request.url)
  const badgeId = url.searchParams.get("badgeId")
  if (!badgeId) {
    return NextResponse.json({ success: false, data: null, error: "badgeId requerido" }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify badge belongs to this user AND this club
  const { data: existing } = await supabase
    .from("player_badges")
    .select("id, badge_type")
    .eq("id", badgeId)
    .eq("user_id", id)
    .eq("club_id", clubId)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ success: false, data: null, error: "Insignia no encontrada" }, { status: 404 })
  }

  const { error } = await supabase.from("player_badges").delete().eq("id", badgeId)

  if (error) {
    return NextResponse.json({ success: false, data: null, error: "Error al revocar insignia" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: null, error: null })
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/club/[clubId]/members/[id]/badges/route.ts
git commit -m "feat(api): club POST + DELETE /members/[id]/badges"
```

---

## Task 7: BadgesSection — Admin Sidebar Component

**Files:**
- Create: `src/components/admin/user-detail/BadgesSection.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/admin/user-detail/BadgesSection.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Medal } from "lucide-react"
import { BADGE_TYPES, BADGE_CONFIG } from "@/features/badges/constants"
import { formatDate } from "@/components/admin/user-detail/helpers"
import type { PlayerBadge } from "@/features/badges/types"
import type { ClubAdmin } from "@/lib/admin/queries"

interface BadgesSectionProps {
  userId: string
  clubs: ClubAdmin[]
}

export function BadgesSection({ userId, clubs }: BadgesSectionProps) {
  const [badges, setBadges] = useState<PlayerBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedType, setSelectedType] = useState<string>("")
  const [selectedClubId, setSelectedClubId] = useState<string>("")
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const fetchBadges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/badges`)
      const json = (await res.json()) as { success: boolean; data: PlayerBadge[] | null; error: string | null }
      if (!json.success) { setError(json.error ?? "Error al cargar insignias"); return }
      setBadges(json.data ?? [])
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void fetchBadges() }, [fetchBadges])

  async function handleGrant() {
    if (!selectedType) return
    setGranting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/badges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badge_type: selectedType,
          club_id: selectedClubId || undefined,
        }),
      })
      const json = (await res.json()) as { success: boolean; error: string | null }
      if (!json.success) { setError(json.error ?? "Error al otorgar"); return }
      setSelectedType("")
      setSelectedClubId("")
      await fetchBadges()
    } catch {
      setError("Error de conexión")
    } finally {
      setGranting(false)
    }
  }

  async function handleRevoke(badgeId: string) {
    setRevoking(badgeId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/badges/${badgeId}`, { method: "DELETE" })
      const json = (await res.json()) as { success: boolean; error: string | null }
      if (!json.success) { setError(json.error ?? "Error al revocar"); return }
      await fetchBadges()
    } catch {
      setError("Error de conexión")
    } finally {
      setRevoking(null)
    }
  }

  const selectedConfig = selectedType ? BADGE_CONFIG[selectedType as keyof typeof BADGE_CONFIG] : null
  const showClubSelect = selectedConfig?.canBeClubScoped ?? false

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Medal className="size-3.5 text-zinc-400 shrink-0" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Insignias</p>
      </div>

      {/* Active badges */}
      {loading ? (
        <p className="text-[11px] text-zinc-400">Cargando...</p>
      ) : badges.length > 0 ? (
        <div className="flex flex-col gap-2">
          {badges.map((badge) => {
            const cfg = BADGE_CONFIG[badge.badge_type]
            return (
              <div
                key={badge.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${cfg.color}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{cfg.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate">{cfg.label}</p>
                    <p className="text-[9px] opacity-70">
                      {badge.club_id ? (badge.club_name ?? "Club") : "Global"} · {formatDate(badge.granted_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleRevoke(badge.id)}
                  disabled={revoking === badge.id}
                  className="text-[9px] font-black uppercase tracking-wide text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 shrink-0 ml-2"
                >
                  {revoking === badge.id ? "…" : "Revocar"}
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[11px] text-zinc-400">Sin insignias</p>
      )}

      {/* Grant form */}
      <div className="rounded-xl border border-dashed border-border p-3 flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Otorgar insignia</p>

        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setSelectedClubId("") }}
          className="w-full border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground bg-card outline-none focus:border-foreground"
        >
          <option value="">— Seleccionar insignia —</option>
          {BADGE_TYPES.map((type) => {
            const cfg = BADGE_CONFIG[type]
            return (
              <option key={type} value={type}>
                {cfg.emoji} {cfg.label}
              </option>
            )
          })}
        </select>

        {showClubSelect && (
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className="w-full border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground bg-card outline-none focus:border-foreground"
          >
            <option value="">— Global (sin club) —</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        )}

        {error && (
          <p className="text-[10px] text-red-600 bg-red-50 rounded-lg px-2 py-1.5 border border-red-100">{error}</p>
        )}

        <button
          onClick={() => void handleGrant()}
          disabled={!selectedType || granting}
          className="w-full bg-foreground text-white rounded-full py-2 text-[11px] font-bold hover:bg-foreground/90 transition-colors disabled:opacity-40"
        >
          {granting ? "Otorgando…" : "Otorgar insignia"}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/user-detail/BadgesSection.tsx
git commit -m "feat(ui): BadgesSection admin sidebar component"
```

---

## Task 8: Wire BadgesSection into UserDetailPanel

**Files:**
- Modify: `src/components/admin/user-detail/UserDetailPanel.tsx`

- [ ] **Step 1: Add `BadgesSection` import and insert into panel body**

In `UserDetailPanel.tsx`, add the import at the top:

```typescript
import { BadgesSection } from "@/components/admin/user-detail/BadgesSection"
```

Then in the JSX body, insert `BadgesSection` between the `VerificationSection` divider and the `MembershipsSection` divider. Replace this block:

```typescript
          <div className="border-t border-border" />
          <VerificationSection user={user} onVerified={onVerified} />
          <div className="border-t border-border" />
          <MembershipsSection userId={user.id} clubs={clubs} onMembershipChange={onMembershipChange} />
```

With:

```typescript
          <div className="border-t border-border" />
          <VerificationSection user={user} onVerified={onVerified} />
          <div className="border-t border-border" />
          <BadgesSection userId={user.id} clubs={clubs} />
          <div className="border-t border-border" />
          <MembershipsSection userId={user.id} clubs={clubs} onMembershipChange={onMembershipChange} />
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Test manually**

```
1. Run: npm run dev
2. Go to /admin/users
3. Click any user row → sidebar opens
4. Scroll down — should see "Insignias" section below Verificación
5. Grant "Jugador VIP" badge → badge appears in list
6. Revoke it → badge disappears
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/user-detail/UserDetailPanel.tsx
git commit -m "feat(ui): add BadgesSection to UserDetailPanel"
```

---

## Task 9: Player Dashboard — MyBadgesSection

**Files:**
- Create: `src/features/badges/components/MyBadgesSection.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create MyBadgesSection**

```typescript
// src/features/badges/components/MyBadgesSection.tsx
import { Medal } from "lucide-react"
import { BADGE_CONFIG } from "@/features/badges/constants"
import type { PlayerBadge } from "@/features/badges/types"

interface MyBadgesSectionProps {
  badges: PlayerBadge[]
}

export function MyBadgesSection({ badges }: MyBadgesSectionProps) {
  if (badges.length === 0) return null

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Medal className="size-4 text-zinc-400" />
        <p className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Mis Insignias</p>
      </div>
      <div className="flex flex-col gap-3">
        {badges.map((badge) => {
          const cfg = BADGE_CONFIG[badge.badge_type]
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg.color}`}
            >
              <span className="text-2xl shrink-0">{cfg.emoji}</span>
              <div className="min-w-0">
                <p className="text-[12px] font-black">{cfg.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {badge.club_id ? (badge.club_name ?? "Club") : "Plataforma global"}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add badges fetch to dashboard page**

In `src/app/(dashboard)/dashboard/page.tsx`, add the import and fetch alongside the existing `Promise.all`:

```typescript
// Add import at top:
import { getPlayerBadges } from "@/features/badges/queries"
import { MyBadgesSection } from "@/features/badges/components/MyBadgesSection"

// Inside the component, add getPlayerBadges to the Promise.all:
const [reservations, invites, tournaments, stats, pickleballRes, badges] =
  await Promise.all([
    getUpcomingReservations(userId),
    getReservationInvites(userId),
    getOpenTournaments(),
    getPlayerStats(userId),
    supabase
      .from("pickleball_profiles")
      .select("singles_rating, doubles_rating, skill_level")
      .eq("user_id", userId)
      .maybeSingle(),
    getPlayerBadges(userId),
  ])
```

Then add `<MyBadgesSection badges={badges} />` in the JSX after `<PickleballRatingWidget>` (or wherever it fits visually in the grid).

- [ ] **Step 3: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test manually**

```
1. Grant "Jugador VIP" badge to a test user from the admin panel
2. Log in as that user → go to /dashboard
3. Should see "Mis Insignias" section with the VIP badge card
```

- [ ] **Step 5: Commit**

```bash
git add src/features/badges/components/MyBadgesSection.tsx src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(ui): MyBadgesSection on player dashboard"
```

---

## Task 10: Player Public Profile — Badge Chips

**Files:**
- Modify: `src/features/users/components/PlayerHeroSection.tsx`
- Modify: `src/app/(dashboard)/dashboard/players/[username]/page.tsx`

- [ ] **Step 1: Extend `PlayerHeroSection` to accept and display badges**

Add `badges` prop and render chips. In `PlayerHeroSection.tsx`, update the interface and JSX:

```typescript
// Add import at top:
import { BADGE_CONFIG } from "@/features/badges/constants"
import type { PlayerBadge } from "@/features/badges/types"

// Extend props interface:
interface PlayerHeroSectionProps {
  profile: Profile
  displayName: string
  rating: number
  rankingPosition: number | null
  badges?: PlayerBadge[]   // ← ADD
}

// In the component signature:
export function PlayerHeroSection({
  profile,
  displayName,
  rating,
  rankingPosition,
  badges = [],
}: PlayerHeroSectionProps) {
```

Add badge chips after the `{/* Name + username */}` block (after `@username` line) in the JSX:

```typescript
      {/* Badge chips */}
      {badges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {badges.map((badge) => {
            const cfg = BADGE_CONFIG[badge.badge_type]
            return (
              <span
                key={badge.id}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${cfg.color}`}
                title={cfg.label}
              >
                {cfg.emoji} {cfg.label}
              </span>
            )
          })}
        </div>
      )}
```

- [ ] **Step 2: Fetch badges in the player profile page**

In `src/app/(dashboard)/dashboard/players/[username]/page.tsx`, add the import and fetch:

```typescript
// Add import:
import { getPlayerBadges } from "@/features/badges/queries"

// Inside the page component, after fetching stats:
const [stats, badges] = await Promise.all([
  getPublicPlayerProfile(profile.id),
  getPlayerBadges(profile.id),
])
```

Then pass `badges` to `<PlayerHeroSection>`:

```typescript
<PlayerHeroSection
  profile={profile}
  displayName={...}
  rating={...}
  rankingPosition={...}
  badges={badges}
/>
```

- [ ] **Step 3: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test manually**

```
1. Grant a badge to a test user from admin panel
2. Navigate to /dashboard/players/<username>
3. Badge chips should appear below the username in the hero section
```

- [ ] **Step 5: Commit**

```bash
git add src/features/users/components/PlayerHeroSection.tsx \
        src/app/(dashboard)/dashboard/players/[username]/page.tsx
git commit -m "feat(ui): badge chips on player public profile"
```

---

## Task 11: Ranking — Badge Icons

**Files:**
- Modify: `src/features/ratings/types.ts`
- Modify: `src/features/ratings/queries.ts`
- Modify: `src/features/ratings/components/RankingView.tsx`

- [ ] **Step 1: Extend `RankingEntry` type**

In `src/features/ratings/types.ts`, add the `badges` field:

```typescript
import type { BadgeType } from "@/features/badges/constants"

export interface RankingEntry {
  position: number
  userId: string
  username: string | null
  fullName: string
  avatarUrl: string | null
  score: number
  wins: number
  losses: number
  badges: BadgeType[]   // ← ADD (empty array when no badges)
}
```

- [ ] **Step 2: Fetch + merge badges in ranking queries**

In `src/features/ratings/queries.ts`, add the import and enrich both query branches:

```typescript
// Add import:
import { getBadgesByUserIds } from "@/features/badges/queries"
import type { BadgeType } from "@/features/badges/constants"
```

After each `.map()` that builds `RankingEntry[]`, add a batch badge fetch. Replace the return in the `if (sport)` branch with:

```typescript
      const entries: RankingEntry[] = (data as Array<{
        user_id: string
        username: string | null
        full_name: string | null
        avatar_url: string | null
        score: number
        wins: number
        losses: number
      }>).map((row, index) => ({
        position: index + 1,
        userId: row.user_id,
        username: row.username ?? null,
        fullName: row.full_name ?? "Jugador",
        avatarUrl: row.avatar_url ?? null,
        score: row.score,
        wins: row.wins,
        losses: row.losses,
        badges: [],
      }))

      const badgeMap = await getBadgesByUserIds(entries.map((e) => e.userId))
      return entries.map((e) => ({
        ...e,
        badges: (badgeMap[e.userId] ?? []).map((b) => b.badge_type),
      }))
```

Apply the same pattern to the global rankings branch (the `rpc("get_global_rankings")` call).

- [ ] **Step 3: Render badge icons in `RankingView.tsx`**

In the existing row render (look for where `entry.fullName` is displayed), add badge emojis after the name. Find the row player name span and add:

```typescript
// After the player name element, add:
{entry.badges.length > 0 && (
  <span className="flex items-center gap-0.5 shrink-0">
    {entry.badges.map((type) => {
      const cfg = BADGE_CONFIG[type]
      return (
        <span key={type} title={cfg.label} className="text-xs leading-none">
          {cfg.emoji}
        </span>
      )
    })}
  </span>
)}
```

Also add the import at the top of `RankingView.tsx`:

```typescript
import { BADGE_CONFIG } from "@/features/badges/constants"
```

- [ ] **Step 4: Verify compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Test manually**

```
1. Grant a badge to a user who appears in the ranking
2. Navigate to /dashboard/ranking
3. Badge emoji should appear next to the player's name in their row
```

- [ ] **Step 6: Commit**

```bash
git add src/features/ratings/types.ts \
        src/features/ratings/queries.ts \
        src/features/ratings/components/RankingView.tsx
git commit -m "feat(ui): badge icons in ranking/leaderboard"
```

---

## Self-Review

**Spec coverage:**
- ✅ `player_badges` table — Task 1
- ✅ 5 badge types with permission map — Task 2
- ✅ Admin GET/POST badges — Task 4
- ✅ Admin DELETE badge — Task 5
- ✅ Club POST/DELETE (OWNER/MANAGER only, club-scoped badge types) — Task 6
- ✅ Inline `BadgesSection` in admin sidebar — Task 7 + 8
- ✅ Player dashboard MyBadgesSection — Task 9
- ✅ Player public profile chips — Task 10
- ✅ Ranking badge icons — Task 11
- ✅ VIP always global (club_id ignored in POST) — Task 4 (resolvedClubId logic)
- ✅ Organizador only admin-grantable (not in CLUB_BADGE_TYPES) — Task 6 + constants

**Auth integration note:** The `AuthContext.badges` field is defined in Task 2 but the auth resolver (`src/features/auth/queries.ts`) is not updated in this plan — badges are fetched on-demand per surface (Server Components query directly; admin sidebar fetches via API). Auth resolver extension can be added in a follow-up if permission-gate middleware is needed for badge-derived permissions.
