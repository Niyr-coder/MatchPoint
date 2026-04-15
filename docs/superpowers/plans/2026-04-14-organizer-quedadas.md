# Organizer Quedadas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the organizer panel for Pickleball quedadas — informal tournaments with simplified creation, guest player support, and rotation-based dynamics (King of the Court, Popcorn).

**Architecture:** Add `event_type='quedada'` and `game_dynamic` flags to the existing `tournaments` table, extend `tournament_participants` with `guest_name`/`guest_lastname` columns, then build a dedicated `src/features/organizer/` UI layer over the existing tournament API. The backend is mostly reused; the only new API routes are `GET/POST /api/quedadas` and `GET /api/users/search`.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase (PostgreSQL + service client) · Zod · Tailwind CSS 4 · Lucide icons

---

## File Map

**New files:**
- `supabase/migrations/055_organizer_quedadas.sql`
- `src/features/organizer/types.ts`
- `src/features/organizer/permissions.ts`
- `src/features/organizer/queries.ts`
- `src/features/organizer/components/OrganizerShell.tsx`
- `src/features/organizer/components/QuedadaWizard.tsx`
- `src/features/organizer/components/QuedadaManagePanel.tsx`
- `src/features/organizer/components/AddPlayerModal.tsx`
- `src/features/organizer/components/RotationScoreboard.tsx`
- `src/app/(dashboard)/dashboard/organizer/page.tsx`
- `src/app/(dashboard)/dashboard/organizer/new/page.tsx`
- `src/app/(dashboard)/dashboard/organizer/[id]/page.tsx`
- `src/app/api/quedadas/route.ts`
- `src/app/api/users/search/route.ts`

**Modified files:**
- `supabase/migrations/055_organizer_quedadas.sql` ← new migration
- `src/features/tournaments/types.ts` ← add `event_type`, `game_dynamic`, `guest_name`, `guest_lastname`
- `src/app/api/tournaments/[id]/participants/route.ts` ← extend POST for guest players
- `src/lib/navigation/nav-configs.ts` ← add `getUserNav(isOrganizer)` param
- `src/app/(dashboard)/dashboard/layout.tsx` ← compute `isOrganizer`, pass to nav

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/055_organizer_quedadas.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 055: Organizer quedadas support

-- 1. Event type flag on tournaments (default 'tournament' preserves all existing rows)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'tournament'
    CHECK (event_type IN ('tournament', 'quedada'));

-- 2. Game dynamic for quedadas
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS game_dynamic TEXT
    CHECK (game_dynamic IN ('standard', 'king_of_court', 'popcorn', 'round_robin'));

-- 3. Guest player columns on participants
ALTER TABLE tournament_participants
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_lastname TEXT;

-- 4. Identity constraint: either a registered user or a guest name must be present
ALTER TABLE tournament_participants
  ADD CONSTRAINT IF NOT EXISTS participant_identity_check
    CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
npx supabase db push
```

Expected: `Applying migration 055_organizer_quedadas...` then success.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/055_organizer_quedadas.sql
git commit -m "feat(db): add event_type, game_dynamic, and guest player columns"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/features/tournaments/types.ts`
- Create: `src/features/organizer/types.ts`

- [ ] **Step 1: Add new fields to Tournament and TournamentParticipant in `src/features/tournaments/types.ts`**

Add after the existing `TournamentStatus` type line (line 3):

```typescript
export type EventType = 'tournament' | 'quedada'
export type GameDynamic = 'standard' | 'king_of_court' | 'popcorn' | 'round_robin'
```

Add `event_type` and `game_dynamic` to the `Tournament` interface after `bracket_locked`:

```typescript
  bracket_locked: boolean
  event_type?: EventType
  game_dynamic?: GameDynamic
  created_at: string
```

Add `guest_name` and `guest_lastname` to `TournamentParticipant` after `confirmed_at`:

```typescript
  confirmed_at?: string | null
  guest_name?: string | null
  guest_lastname?: string | null
```

Add `event_type` and `game_dynamic` to `CreateTournamentInput` after `is_official`:

```typescript
  is_official?: boolean
  event_type?: EventType
  game_dynamic?: GameDynamic
  extras?: TournamentExtras
```

- [ ] **Step 2: Create `src/features/organizer/types.ts`**

```typescript
import type { Tournament, TournamentParticipant } from "@/features/tournaments/types"
import type { GameDynamic } from "@/features/tournaments/types"

export type { GameDynamic }

/** Quedada is a Tournament with event_type = 'quedada' */
export type Quedada = Tournament & {
  event_type: 'quedada'
  game_dynamic: GameDynamic
}

/** Participant that may be a guest (no user_id) */
export interface QuedadaParticipant extends TournamentParticipant {
  guest_name?: string | null
  guest_lastname?: string | null
  /** Joined profile data when user_id is present */
  profiles?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface CreateQuedadaInput {
  name: string
  game_dynamic: GameDynamic
  modality: string
  max_participants: 4 | 8 | 16 | 32
  start_date: string
  start_time: string
  club_id?: string
  is_public?: boolean
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (or only pre-existing errors unrelated to these files).

- [ ] **Step 4: Commit**

```bash
git add src/features/tournaments/types.ts src/features/organizer/types.ts
git commit -m "feat(types): add event_type, game_dynamic, guest player fields and organizer types"
```

---

## Task 3: Organizer Permissions + Queries

**Files:**
- Create: `src/features/organizer/permissions.ts`
- Create: `src/features/organizer/queries.ts`

- [ ] **Step 1: Create `src/features/organizer/permissions.ts`**

```typescript
import type { AuthContext } from "@/features/auth/types"
import { getUserRoles } from "@/features/memberships/queries"

/** True if user has the organizador_verificado badge in any club */
function hasBadge(ctx: AuthContext): boolean {
  return ctx.badges.some(b => b.badge_type === 'organizador_verificado')
}

/** True if user has OWNER, MANAGER, or COACH role in any club */
async function hasOrganizerRole(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.some(r => ['owner', 'manager', 'coach'].includes(r.role))
}

/** Check if the authenticated user can create and manage quedadas */
export async function canOrganize(ctx: AuthContext): Promise<boolean> {
  if (hasBadge(ctx)) return true
  return hasOrganizerRole(ctx.userId)
}
```

- [ ] **Step 2: Create `src/features/organizer/queries.ts`**

```typescript
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { Quedada, QuedadaParticipant } from "@/features/organizer/types"

/** Fetch all quedadas created by a specific user, ordered by start_date desc */
export async function getOrganizerQuedadas(userId: string): Promise<Quedada[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("event_type", "quedada")
    .eq("created_by", userId)
    .order("start_date", { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Quedada[]
}

/** Fetch a single quedada by id */
export async function getQuedadaById(id: string): Promise<Quedada | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, clubs(name)")
    .eq("id", id)
    .eq("event_type", "quedada")
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as unknown as Quedada
}

/** Fetch all participants for a quedada, including guest info and profile */
export async function getQuedadaParticipants(quedadaId: string): Promise<QuedadaParticipant[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from("tournament_participants")
    .select(`
      id,
      user_id,
      status,
      guest_name,
      guest_lastname,
      registered_at,
      profiles!tp_user_profile_fk (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("tournament_id", quedadaId)
    .order("registered_at", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as QuedadaParticipant[]
}

/** Search registered users by username or full_name (for AddPlayerModal) */
export async function searchUsers(
  query: string,
  limit = 5
): Promise<Array<{ id: string; username: string | null; full_name: string | null; avatar_url: string | null }>> {
  const service = createServiceClient()
  const q = `%${query.toLowerCase()}%`

  const { data, error } = await service
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .or(`username.ilike.${q},full_name.ilike.${q}`)
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/organizer/permissions.ts src/features/organizer/queries.ts
git commit -m "feat(organizer): add canOrganize permission helper and quedada queries"
```

---

## Task 4: API Routes — /api/quedadas and /api/users/search

**Files:**
- Create: `src/app/api/quedadas/route.ts`
- Create: `src/app/api/users/search/route.ts`

- [ ] **Step 1: Create `src/app/api/quedadas/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { authorize } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getOrganizerQuedadas } from "@/features/organizer/queries"
import { createTournament } from "@/features/tournaments/queries"
import { z } from "zod"

const createQuedadaSchema = z.object({
  name: z.string().min(3).max(100),
  game_dynamic: z.enum(["standard", "king_of_court", "popcorn", "round_robin"]),
  modality: z.string().min(1).max(50),
  max_participants: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  club_id: z.string().uuid().optional(),
  is_public: z.boolean().optional(),
})

export async function GET() {
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const ctx = authResult.context
  const allowed = await canOrganize(ctx)
  if (!allowed) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const quedadas = await getOrganizerQuedadas(ctx.userId)
    return NextResponse.json({ success: true, data: quedadas })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener quedadas"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await authorize()
  if (!authResult.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const ctx = authResult.context
  const allowed = await canOrganize(ctx)
  if (!allowed) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createQuedadaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.data.issues[0].message },
      { status: 422 }
    )
  }

  const d = parsed.data

  try {
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
    })
    return NextResponse.json({ success: true, data: quedada }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear quedada"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Fix createTournament in `src/features/tournaments/queries.ts` to pass through new fields**

In `createTournament`, inside the `fullInsert` object, add after `is_official`:

```typescript
    is_official: input.is_official ?? false,
    ...(input.event_type ? { event_type: input.event_type } : {}),
    ...(input.game_dynamic ? { game_dynamic: input.game_dynamic } : {}),
```

- [ ] **Step 3: Create `src/app/api/users/search/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchUsers } from "@/features/organizer/queries"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""

  if (query.length < 2) {
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    const users = await searchUsers(query)
    return NextResponse.json({ success: true, data: users })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al buscar usuarios"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/quedadas/route.ts src/app/api/users/search/route.ts src/features/tournaments/queries.ts
git commit -m "feat(api): add /api/quedadas and /api/users/search routes"
```

---

## Task 5: Extend Participants Route for Guest Players

**Files:**
- Modify: `src/app/api/tournaments/[id]/participants/route.ts`

- [ ] **Step 1: Replace the Zod schema and POST handler to support both registered and guest participants**

Replace the schema at the top of the file:

```typescript
const addParticipantSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("registered"),
    userId: z.string().uuid("userId debe ser un UUID válido"),
  }),
  z.object({
    type: z.literal("guest"),
    guestName: z.string().min(1).max(50),
    guestLastname: z.string().min(1).max(50),
  }),
])
```

Replace the POST body parsing and insert section (after the existing `tournament` check) with:

```typescript
  let rawBody: unknown
  try { rawBody = await request.json() } catch { rawBody = {} }
  const parsed = addParticipantSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const body = parsed.data

  const service = createServiceClient()

  if (body.type === "guest") {
    // Guest players are always new — no deduplication needed
    const { data, error } = await service
      .from("tournament_participants")
      .insert({
        tournament_id: id,
        user_id: null,
        guest_name: body.guestName,
        guest_lastname: body.guestLastname,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data }, { status: 201 })
  }

  // Registered user flow (existing logic, unchanged)
  const { data: existing } = await service
    .from("tournament_participants")
    .select("id, status")
    .eq("tournament_id", id)
    .eq("user_id", body.userId)
    .maybeSingle()

  if (existing) {
    if (existing.status === "withdrawn") {
      const { data, error } = await service
        .from("tournament_participants")
        .update({ status: "registered", withdrawal_reason: null })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data, reregistered: true })
    }
    return NextResponse.json({ success: false, error: "El participante ya está inscrito" }, { status: 409 })
  }

  const { data, error } = await service
    .from("tournament_participants")
    .insert({ tournament_id: id, user_id: body.userId })
    .select()
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // For in_progress: fill first available bye slot
  let bracketSlotFilled = false
  if (tournament.status === "in_progress") {
    const { data: byeMatch } = await service
      .from("tournament_brackets")
      .select("id, player1_id, player2_id")
      .eq("tournament_id", id)
      .eq("status", "bye")
      .order("round", { ascending: true })
      .order("match_number", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (byeMatch) {
      const slot = byeMatch.player1_id === null ? "player1_id" : "player2_id"
      const newStatus = byeMatch.player1_id !== null || byeMatch.player2_id !== null ? "pending" : "bye"
      await service
        .from("tournament_brackets")
        .update({ [slot]: body.userId, status: newStatus })
        .eq("id", byeMatch.id)
      bracketSlotFilled = true
    }
  }

  return NextResponse.json({ success: true, data, bracketSlotFilled }, { status: 201 })
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tournaments/[id]/participants/route.ts
git commit -m "feat(api): extend participants route to support guest players"
```

---

## Task 6: Navigation Integration

**Files:**
- Modify: `src/lib/navigation/nav-configs.ts`
- Modify: `src/app/(dashboard)/dashboard/layout.tsx`

- [ ] **Step 1: Add `isOrganizer` param to `getUserNav` in `src/lib/navigation/nav-configs.ts`**

Change the function signature and add the conditional item:

```typescript
export function getUserNav(isOrganizer = false): NavSection[] {
  return [
    {
      title: "Explorar",
      items: [
        { label: "Inicio", href: "/dashboard", icon: "Home" },
        { label: "Clubes", href: "/dashboard/clubs", icon: "Building2" },
        { label: "Ranking", href: "/dashboard/ranking", icon: "Trophy" },
        { label: "Eventos", href: "/dashboard/events", icon: "CalendarDays" },
        ...(isOrganizer
          ? [{ label: "Mis Quedadas", href: "/dashboard/organizer", icon: "Swords" }]
          : []),
      ],
    },
    {
      title: "Mi Cuenta",
      items: [
        { label: "Chat", href: "/dashboard/chat", icon: "MessageSquare" },
        { label: "Shop", href: "/dashboard/shop", icon: "ShoppingBag" },
        { label: "Mi Team", href: "/dashboard/team", icon: "Users" },
        { label: "Solicitar club", href: "/dashboard/request-club", icon: "PlusCircle" },
      ],
    },
  ]
}
```

- [ ] **Step 2: Update `src/app/(dashboard)/dashboard/layout.tsx` to compute `isOrganizer`**

Replace the layout body:

```typescript
export const dynamic = "force-dynamic"

import { authorizeOrRedirect } from "@/features/auth/queries"
import { getUserNav } from "@/lib/navigation/nav-configs"
import { getUserRoles } from "@/features/memberships/queries"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { AppRole } from "@/types"

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await authorizeOrRedirect()

  if (ctx.globalRole === "admin") {
    redirect("/admin")
  }

  const userRoles = await getUserRoles(ctx.userId)

  const cookieStore = await cookies()
  const playerMode = cookieStore.get("player_mode")?.value
  if (!playerMode) {
    const managementRoles = userRoles.filter((r) => r.role !== "user")
    if (managementRoles.length === 1) {
      redirect(`/club/${managementRoles[0].clubId}/${managementRoles[0].role}`)
    }
    if (managementRoles.length > 1) {
      redirect("/context-selector")
    }
  }

  const isOrganizer =
    ctx.badges.some(b => b.badge_type === "organizador_verificado") ||
    userRoles.some(r => ["owner", "manager", "coach"].includes(r.role))

  const navSections = getUserNav(isOrganizer)

  return (
    <DashboardShell
      navSections={navSections}
      profile={ctx.profile}
      currentRole={ctx.globalRole as AppRole}
    >
      {children}
    </DashboardShell>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/navigation/nav-configs.ts src/app/(dashboard)/dashboard/layout.tsx
git commit -m "feat(nav): add conditional Mis Quedadas nav item for organizers"
```

---

## Task 7: Route Pages

**Files:**
- Create: `src/app/(dashboard)/dashboard/organizer/page.tsx`
- Create: `src/app/(dashboard)/dashboard/organizer/new/page.tsx`
- Create: `src/app/(dashboard)/dashboard/organizer/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/(dashboard)/dashboard/organizer/page.tsx`**

```typescript
import { authorizeOrRedirect } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getOrganizerQuedadas } from "@/features/organizer/queries"
import { OrganizerShell } from "@/features/organizer/components/OrganizerShell"
import { redirect } from "next/navigation"

export default async function OrganizerPage() {
  const ctx = await authorizeOrRedirect()
  const allowed = await canOrganize(ctx)
  if (!allowed) redirect("/dashboard")

  const quedadas = await getOrganizerQuedadas(ctx.userId)

  return <OrganizerShell quedadas={quedadas} />
}
```

- [ ] **Step 2: Create `src/app/(dashboard)/dashboard/organizer/new/page.tsx`**

```typescript
import { authorizeOrRedirect } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getUserRoles } from "@/features/memberships/queries"
import { QuedadaWizard } from "@/features/organizer/components/QuedadaWizard"
import { redirect } from "next/navigation"

export default async function NewQuedadaPage() {
  const ctx = await authorizeOrRedirect()
  const allowed = await canOrganize(ctx)
  if (!allowed) redirect("/dashboard")

  const userRoles = await getUserRoles(ctx.userId)
  const clubs = userRoles.map(r => ({ id: r.clubId, name: r.clubName }))

  return <QuedadaWizard clubs={clubs} />
}
```

- [ ] **Step 3: Create `src/app/(dashboard)/dashboard/organizer/[id]/page.tsx`**

```typescript
import { authorizeOrRedirect } from "@/features/auth/queries"
import { canOrganize } from "@/features/organizer/permissions"
import { getQuedadaById, getQuedadaParticipants } from "@/features/organizer/queries"
import { QuedadaManagePanel } from "@/features/organizer/components/QuedadaManagePanel"
import { redirect, notFound } from "next/navigation"

export default async function ManageQuedadaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await authorizeOrRedirect()
  const allowed = await canOrganize(ctx)
  if (!allowed) redirect("/dashboard")

  const [quedada, participants] = await Promise.all([
    getQuedadaById(id),
    getQuedadaParticipants(id),
  ])

  if (!quedada) notFound()
  if (quedada.created_by !== ctx.userId) redirect("/dashboard/organizer")

  return <QuedadaManagePanel quedada={quedada} initialParticipants={participants} />
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/organizer/
git commit -m "feat(pages): scaffold organizer route pages"
```

---

## Task 8: OrganizerShell Component

**Files:**
- Create: `src/features/organizer/components/OrganizerShell.tsx`

- [ ] **Step 1: Create `src/features/organizer/components/OrganizerShell.tsx`**

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Swords } from "lucide-react"
import type { Quedada } from "@/features/organizer/types"

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: "Borrador",   classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  open:        { label: "Abierta",    classes: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En curso",   classes: "bg-green-50 text-green-700 border-green-200" },
  completed:   { label: "Completada", classes: "bg-zinc-50 text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelada",  classes: "bg-red-50 text-red-600 border-red-200" },
}

const DYNAMIC_LABELS: Record<string, string> = {
  standard: "Estándar",
  king_of_court: "👑 King of the Court",
  popcorn: "🍿 Popcorn",
  round_robin: "Round Robin",
}

const TABS = ["Mis Quedadas", "Historial"] as const
type Tab = (typeof TABS)[number]

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function OrganizerShell({ quedadas }: { quedadas: Quedada[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("Mis Quedadas")

  const active = quedadas.filter(q => !["completed", "cancelled"].includes(q.status))
  const history = quedadas.filter(q => ["completed", "cancelled"].includes(q.status))
  const displayed = activeTab === "Mis Quedadas" ? active : history

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
            Organización
          </p>
          <h1 className="text-2xl font-black text-foreground">Mis Quedadas</h1>
        </div>
        <Link
          href="/dashboard/organizer/new"
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 bg-foreground text-white rounded-full hover:bg-foreground/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Nueva quedada
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-zinc-400 hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-border rounded-2xl">
          <Swords className="size-10 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-400">
            {activeTab === "Mis Quedadas" ? "No hay quedadas activas" : "Sin historial aún"}
          </p>
          {activeTab === "Mis Quedadas" && (
            <Link
              href="/dashboard/organizer/new"
              className="text-[11px] font-black text-foreground hover:underline"
            >
              Crea la primera →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(q => {
            const st = STATUS_STYLES[q.status] ?? STATUS_STYLES.open
            return (
              <Link
                key={q.id}
                href={`/dashboard/organizer/${q.id}`}
                className="rounded-2xl bg-card border border-foreground/30 p-5 flex flex-col gap-3 hover:border-foreground transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                    {st.label}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400">{formatDate(q.start_date)}</span>
                </div>
                <h3 className="text-sm font-black text-foreground leading-tight">{q.name}</h3>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>🏓 Pickleball</span>
                  {q.game_dynamic && (
                    <>
                      <span>·</span>
                      <span>{DYNAMIC_LABELS[q.game_dynamic] ?? q.game_dynamic}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end pt-2 border-t border-border">
                  <span className="text-[11px] font-black text-foreground uppercase tracking-wide">Gestionar →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/features/organizer/components/OrganizerShell.tsx
git commit -m "feat(ui): OrganizerShell — main quedadas panel"
```

---

## Task 9: QuedadaWizard Component

**Files:**
- Create: `src/features/organizer/components/QuedadaWizard.tsx`

- [ ] **Step 1: Create `src/features/organizer/components/QuedadaWizard.tsx`**

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { GameDynamic } from "@/features/organizer/types"

const DYNAMICS: { value: GameDynamic; label: string; emoji: string; description: string }[] = [
  { value: "standard",      label: "Estándar",         emoji: "🎯", description: "Partidos normales, sin rotación" },
  { value: "king_of_court", label: "King of the Court", emoji: "👑", description: "Ganador se queda, perdedor rota" },
  { value: "popcorn",       label: "Popcorn",           emoji: "🍿", description: "Rotación aleatoria por puntos" },
  { value: "round_robin",   label: "Round Robin",       emoji: "🔄", description: "Todos contra todos" },
]

const MODALITIES = ["Singles", "Dobles", "Mixtos"]
const MAX_PLAYERS = [4, 8, 16, 32] as const

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground placeholder:text-zinc-300 focus:outline-none focus:border-foreground transition-colors bg-card"
const labelCls = "text-[11px] font-black uppercase tracking-[0.15em] text-zinc-500"

interface WizardForm {
  name: string
  game_dynamic: GameDynamic | ""
  modality: string
  max_participants: 4 | 8 | 16 | 32
  start_date: string
  start_time: string
  club_id: string
  is_public: boolean
}

function ProgressBar({ current }: { current: number }) {
  const steps = ["Detalles", "Fecha & Acceso", "Jugadores"]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
              i + 1 < current ? "bg-foreground border-foreground text-white"
              : i + 1 === current ? "border-foreground text-foreground bg-card"
              : "border-zinc-200 text-zinc-300 bg-card"
            }`}>
              {i + 1 < current ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wide hidden sm:block ${
              i + 1 <= current ? "text-foreground" : "text-zinc-300"
            }`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 transition-colors ${i + 1 < current ? "bg-foreground" : "bg-zinc-200"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function QuedadaWizard({ clubs }: { clubs: { id: string; name: string }[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<WizardForm>({
    name: "",
    game_dynamic: "",
    modality: "",
    max_participants: 16,
    start_date: "",
    start_time: "",
    club_id: clubs[0]?.id ?? "",
    is_public: false,
  })

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/quedadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          game_dynamic: form.game_dynamic,
          modality: form.modality,
          max_participants: form.max_participants,
          start_date: form.start_date,
          start_time: form.start_time,
          club_id: form.is_public ? undefined : form.club_id || undefined,
          is_public: form.is_public,
        }),
      })
      const json = await res.json() as { success: boolean; data?: { id: string }; error?: string }
      if (!json.success) throw new Error(json.error ?? "Error al crear quedada")
      router.push(`/dashboard/organizer/${json.data!.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push("/dashboard/organizer")}
          className="p-2 rounded-xl border border-border hover:border-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Organización</p>
          <h1 className="text-xl font-black">Nueva Quedada</h1>
        </div>
      </div>

      <ProgressBar current={step} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <label className={labelCls}>Nombre</label>
            <input className={`${inputCls} mt-2`} placeholder="Ej: Quedada Pickleball Lunes"
              value={form.name} onChange={e => update("name", e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Deporte</label>
            <div className="mt-2 px-4 py-2.5 rounded-xl border border-border bg-muted text-sm font-medium text-zinc-400 flex items-center justify-between">
              <span>🏓 Pickleball</span>
              <span className="text-[10px] bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full">Más próximamente</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Dinámica de juego</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DYNAMICS.map(d => (
                <button key={d.value} type="button"
                  onClick={() => update("game_dynamic", d.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    form.game_dynamic === d.value ? "border-foreground bg-foreground text-white" : "border-border hover:border-foreground/50"
                  }`}>
                  <div className="text-sm font-bold">{d.emoji} {d.label}</div>
                  <div className={`text-[11px] mt-0.5 ${form.game_dynamic === d.value ? "opacity-75" : "text-zinc-500"}`}>{d.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Modalidad</label>
            <div className="mt-2 flex gap-2">
              {MODALITIES.map(m => (
                <button key={m} type="button"
                  onClick={() => update("modality", m)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-[12px] font-black uppercase tracking-wide transition-colors ${
                    form.modality === m ? "border-foreground bg-foreground text-white" : "border-border hover:border-foreground/50"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Máx. jugadores</label>
            <div className="mt-2 flex gap-2">
              {MAX_PLAYERS.map(n => (
                <button key={n} type="button"
                  onClick={() => update("max_participants", n)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-colors ${
                    form.max_participants === n ? "border-foreground bg-foreground text-white" : "border-border hover:border-foreground/50"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!form.name || !form.game_dynamic || !form.modality}
            onClick={() => setStep(2)}
            className="w-full py-3 bg-foreground text-white rounded-xl text-[12px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Continuar →
          </button>
        </div>
      )}

      {/* Step 2: Date & Access */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" className={`${inputCls} mt-2`}
                value={form.start_date} onChange={e => update("start_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Hora</label>
              <input type="time" className={`${inputCls} mt-2`}
                value={form.start_time} onChange={e => update("start_time", e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Visibilidad</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => update("is_public", false)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  !form.is_public ? "border-foreground bg-foreground text-white" : "border-border"
                }`}>
                <div className="text-sm font-bold">🔒 Solo miembros del club</div>
                <div className={`text-[11px] mt-0.5 ${!form.is_public ? "opacity-75" : "text-zinc-500"}`}>Privado</div>
              </button>
              <button type="button"
                onClick={() => update("is_public", true)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  form.is_public ? "border-foreground bg-foreground text-white" : "border-border"
                }`}>
                <div className="text-sm font-bold">🌐 Pública</div>
                <div className={`text-[11px] mt-0.5 ${form.is_public ? "opacity-75" : "text-zinc-500"}`}>Cualquier usuario</div>
              </button>
            </div>
          </div>

          {!form.is_public && clubs.length > 0 && (
            <div>
              <label className={labelCls}>Club</label>
              <select className={`${inputCls} mt-2`}
                value={form.club_id} onChange={e => update("club_id", e.target.value)}>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <button
            disabled={!form.start_date || !form.start_time}
            onClick={() => setStep(3)}
            className="w-full py-3 bg-foreground text-white rounded-xl text-[12px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Continuar →
          </button>
        </div>
      )}

      {/* Step 3: Players (summary + create) */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div className="bg-muted rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-2">Resumen</p>
            <div className="text-sm font-bold">{form.name}</div>
            <div className="text-xs text-zinc-500">🏓 Pickleball · {form.modality} · {form.game_dynamic}</div>
            <div className="text-xs text-zinc-500">📅 {form.start_date} {form.start_time} · 👥 máx {form.max_participants}</div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            Después de crear la quedada podrás agregar jugadores manualmente o compartir el link de invitación.
          </div>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-3 bg-foreground text-white rounded-xl text-[12px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {loading ? "Creando..." : "Crear Quedada ✓"}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/features/organizer/components/QuedadaWizard.tsx
git commit -m "feat(ui): QuedadaWizard — 3-step quedada creation"
```

---

## Task 10: QuedadaManagePanel + AddPlayerModal

**Files:**
- Create: `src/features/organizer/components/AddPlayerModal.tsx`
- Create: `src/features/organizer/components/QuedadaManagePanel.tsx`

- [ ] **Step 1: Create `src/features/organizer/components/AddPlayerModal.tsx`**

```typescript
"use client"

import { useState, useRef } from "react"
import { X, Search, UserPlus } from "lucide-react"

interface RegisteredUser {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface AddPlayerModalProps {
  quedadaId: string
  onClose: () => void
  onAdded: () => void
}

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground placeholder:text-zinc-300 focus:outline-none focus:border-foreground transition-colors bg-card"

export function AddPlayerModal({ quedadaId, onClose, onAdded }: AddPlayerModalProps) {
  const [tab, setTab] = useState<"registered" | "guest">("registered")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RegisteredUser[]>([])
  const [searching, setSearching] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestLastname, setGuestLastname] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleQueryChange(value: string) {
    setQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) { setResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`)
        const json = await res.json() as { success: boolean; data?: RegisteredUser[] }
        if (json.success) setResults(json.data ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  async function addRegistered(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${quedadaId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "registered", userId }),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "Error al agregar")
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  async function addGuest() {
    if (!guestName.trim() || !guestLastname.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${quedadaId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "guest", guestName: guestName.trim(), guestLastname: guestLastname.trim() }),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "Error al agregar")
      setGuestName("")
      setGuestLastname("")
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-black text-base">Agregar jugador</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Tab toggle */}
        <div className="p-5 pb-0">
          <div className="grid grid-cols-2 bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab("registered")}
              className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                tab === "registered" ? "bg-card shadow text-foreground" : "text-zinc-400"
              }`}>
              👤 Usuario registrado
            </button>
            <button
              onClick={() => setTab("guest")}
              className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                tab === "guest" ? "bg-card shadow text-foreground" : "text-zinc-400"
              }`}>
              📝 Jugador temporal
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{error}</div>
          )}

          {tab === "registered" && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Buscar por nombre o @username"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                />
              </div>
              {searching && <p className="text-xs text-zinc-400 text-center">Buscando...</p>}
              {results.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  {results.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-muted transition-colors border-b border-border last:border-0">
                      <div className="size-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                        {(u.full_name ?? u.username ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{u.full_name ?? u.username}</div>
                        {u.username && <div className="text-[11px] text-zinc-400">@{u.username}</div>}
                      </div>
                      <button
                        disabled={loading}
                        onClick={() => addRegistered(u.id)}
                        className="px-3 py-1.5 bg-foreground text-white rounded-lg text-[11px] font-black hover:bg-foreground/90 disabled:opacity-40 transition-colors">
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "guest" && (
            <div className="flex flex-col gap-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                Solo existe para esta quedada. No necesita cuenta en la plataforma.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-1.5 block">Nombre</label>
                  <input className={inputCls} placeholder="Andrés" value={guestName} onChange={e => setGuestName(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-1.5 block">Apellido</label>
                  <input className={inputCls} placeholder="Torres" value={guestLastname} onChange={e => setGuestLastname(e.target.value)} />
                </div>
              </div>
              <button
                disabled={loading || !guestName.trim() || !guestLastname.trim()}
                onClick={addGuest}
                className="w-full py-2.5 bg-foreground text-white rounded-xl text-[11px] font-black uppercase tracking-wide hover:bg-foreground/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                <UserPlus className="size-3.5" />
                {loading ? "Agregando..." : `Agregar "${guestName} ${guestLastname}" como temporal`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/features/organizer/components/QuedadaManagePanel.tsx`**

```typescript
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Users, Swords, Link2, UserPlus, Trash2 } from "lucide-react"
import { AddPlayerModal } from "@/features/organizer/components/AddPlayerModal"
import { RotationScoreboard } from "@/features/organizer/components/RotationScoreboard"
import type { Quedada, QuedadaParticipant } from "@/features/organizer/types"

const DYNAMIC_LABELS: Record<string, string> = {
  standard: "Estándar",
  king_of_court: "👑 King of the Court",
  popcorn: "🍿 Popcorn",
  round_robin: "Round Robin",
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: "Borrador",   classes: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  open:        { label: "Abierta",    classes: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "En curso",   classes: "bg-green-50 text-green-700 border-green-200" },
  completed:   { label: "Completada", classes: "bg-zinc-50 text-zinc-500 border-zinc-200" },
  cancelled:   { label: "Cancelada",  classes: "bg-red-50 text-red-600 border-red-200" },
}

const TABS = ["Jugadores", "Bracket / Resultados", "Invitación"] as const
type Tab = (typeof TABS)[number]

const USES_BRACKET = ["standard", "round_robin"]

interface Props {
  quedada: Quedada
  initialParticipants: QuedadaParticipant[]
}

export function QuedadaManagePanel({ quedada, initialParticipants }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("Jugadores")
  const [participants, setParticipants] = useState(initialParticipants)
  const [showAddModal, setShowAddModal] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [inviteLink] = useState(`matchpoint.top/join/${quedada.id.slice(0, 8)}`)

  const st = STATUS_STYLES[quedada.status] ?? STATUS_STYLES.open
  const hasBracket = USES_BRACKET.includes(quedada.game_dynamic ?? "standard")

  const refreshParticipants = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${quedada.id}/participants`)
    const json = await res.json() as { success: boolean; data?: QuedadaParticipant[] }
    if (json.success && json.data) setParticipants(json.data)
    setShowAddModal(false)
  }, [quedada.id])

  async function removeParticipant(participantId: string) {
    setRemovingId(participantId)
    try {
      await fetch(`/api/tournaments/${quedada.id}/participants/${participantId}`, { method: "DELETE" })
      setParticipants(prev => prev.filter(p => p.id !== participantId))
    } finally {
      setRemovingId(null)
    }
  }

  function displayName(p: QuedadaParticipant): string {
    if (p.guest_name) return `${p.guest_name} ${p.guest_lastname ?? ""}`.trim()
    return p.profiles?.full_name ?? p.profiles?.username ?? "Usuario"
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-2xl bg-card border border-foreground/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏓</span>
              <h1 className="text-lg font-black">{quedada.name}</h1>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${st.classes}`}>{st.label}</span>
            </div>
            <p className="text-xs text-zinc-500">
              {DYNAMIC_LABELS[quedada.game_dynamic ?? "standard"]} · {quedada.modality} · {quedada.start_date}
              {quedada.start_time ? ` ${quedada.start_time}` : ""}
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("¿Cancelar esta quedada?")) return
              await fetch(`/api/tournaments/${quedada.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "cancelled" }),
              })
              router.push("/dashboard/organizer")
            }}
            className="text-[11px] font-black text-red-600 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors shrink-0">
            Cancelar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors border-b-2 -mb-px ${
              tab === t ? "border-foreground text-foreground" : "border-transparent text-zinc-400 hover:text-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB: Jugadores */}
      {tab === "Jugadores" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold">{participants.length} / {quedada.max_participants} jugadores</span>
              <div className="mt-1 h-1.5 w-48 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all"
                  style={{ width: `${Math.min(100, (participants.length / (quedada.max_participants ?? 1)) * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-2 border border-border rounded-xl hover:border-foreground transition-colors">
              <UserPlus className="size-3.5" />
              Agregar
            </button>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-border rounded-2xl">
              Sin jugadores aún. Agrega manualmente o comparte el link.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {displayName(p)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{displayName(p)}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {p.guest_name && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">INVITADO</span>
                      )}
                      <span className="text-[11px] text-zinc-400">{p.status}</span>
                    </div>
                  </div>
                  <button
                    disabled={removingId === p.id}
                    onClick={() => removeParticipant(p.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Bracket / Resultados */}
      {tab === "Bracket / Resultados" && (
        <div>
          {hasBracket ? (
            <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-border rounded-2xl">
              <Swords className="size-8 mx-auto mb-2 text-zinc-300" />
              El bracket se genera al iniciar la quedada.<br />
              <span className="text-xs">Usa el botón "Iniciar" cuando todos los jugadores estén listos.</span>
            </div>
          ) : (
            <RotationScoreboard quedadaId={quedada.id} dynamic={quedada.game_dynamic ?? "king_of_court"} participants={participants} />
          )}
        </div>
      )}

      {/* TAB: Invitación */}
      {tab === "Invitación" && (
        <div className="flex flex-col gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-green-700 mb-2">Link de invitación activo</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-green-800 bg-white border border-green-200 px-3 py-2 rounded-lg font-mono truncate">
                {inviteLink}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`https://${inviteLink}`)}
                className="px-3 py-2 text-[11px] font-black text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap">
                Copiar
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-zinc-500">
            <Link2 className="size-3.5 mt-0.5 shrink-0" />
            <span>Cualquier {quedada.club_id ? "miembro del club" : "usuario de la plataforma"} puede unirse con este link hasta que cierres las inscripciones.</span>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddPlayerModal
          quedadaId={quedada.id}
          onClose={() => setShowAddModal(false)}
          onAdded={refreshParticipants}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/features/organizer/components/AddPlayerModal.tsx src/features/organizer/components/QuedadaManagePanel.tsx
git commit -m "feat(ui): QuedadaManagePanel and AddPlayerModal"
```

---

## Task 11: RotationScoreboard + Tournaments Page Button

**Files:**
- Create: `src/features/organizer/components/RotationScoreboard.tsx`
- Modify: `src/app/(dashboard)/dashboard/tournaments/page.tsx`

- [ ] **Step 1: Create `src/features/organizer/components/RotationScoreboard.tsx`**

```typescript
"use client"

import type { QuedadaParticipant } from "@/features/organizer/types"

interface RotationEntry {
  winnerId: string
  loserId: string
  timestamp: string
}

interface Props {
  quedadaId: string
  dynamic: string
  participants: QuedadaParticipant[]
}

function getDisplayName(p: QuedadaParticipant): string {
  if (p.guest_name) return `${p.guest_name} ${p.guest_lastname ?? ""}`.trim()
  return p.profiles?.full_name ?? p.profiles?.username ?? "?"
}

export function RotationScoreboard({ participants, dynamic }: Props) {
  const descriptions: Record<string, string> = {
    king_of_court: "El ganador permanece en cancha. El perdedor pasa al final de la fila.",
    popcorn: "Rotación aleatoria — el ganador elige quién entra.",
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-muted rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">
          {dynamic === "king_of_court" ? "👑 King of the Court" : "🍿 Popcorn"}
        </p>
        <p className="text-xs text-zinc-500">{descriptions[dynamic] ?? ""}</p>
      </div>

      {participants.length < 2 ? (
        <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-border rounded-2xl">
          Necesitas al menos 2 jugadores para iniciar el scoreboard.
        </div>
      ) : (
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-3">Jugadores ({participants.length})</p>
          <div className="flex flex-col gap-2">
            {participants.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                i === 0 ? "border-green-200 bg-green-50" : "border-border"
              }`}>
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  i === 0 ? "bg-green-600 text-white" : "bg-muted text-zinc-600"
                }`}>
                  {i === 0 ? "👑" : i + 1}
                </div>
                <span className="text-sm font-bold">{getDisplayName(p)}</span>
                {i === 0 && <span className="ml-auto text-[10px] font-black text-green-600 uppercase">En cancha</span>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 mt-3 text-center">
            Registra los resultados manualmente por ahora — scoring digital llegará pronto.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add "Organizar quedada" button to `src/app/(dashboard)/dashboard/tournaments/page.tsx`**

In `TournamentsPage`, first add `authorizeOrRedirect` result to check organizer permission. Replace the function signature and header:

```typescript
export default async function TournamentsPage() {
  const ctx = await authorizeOrRedirect()
  const { canOrganize } = await import("@/features/organizer/permissions")
  const isOrganizer = await canOrganize(ctx)

  const [openTournaments, myTournaments] = await Promise.all([
    getOpenTournaments(),
    getCreatedTournaments(ctx.userId),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Competencias"
        title="Torneos"
        action={
          <div className="flex items-center gap-2">
            {isOrganizer && (
              <Link
                href="/dashboard/organizer/new"
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 border border-foreground text-foreground rounded-full hover:bg-foreground hover:text-white transition-colors"
              >
                <Swords className="size-3.5" />
                Organizar quedada
              </Link>
            )}
            <Link
              href="/dashboard/tournaments/create"
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] px-4 py-2 bg-foreground text-white rounded-full hover:bg-foreground/90 transition-colors"
            >
              <Plus className="size-3.5" />
              Crear Torneo
            </Link>
          </div>
        }
      />
      {/* rest of existing JSX unchanged */}
```

Also add `Swords` to the import from lucide-react:

```typescript
import { Trophy, Users, Plus, Swords } from "lucide-react"
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Build check**

```bash
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` (or same pre-existing warnings as before).

- [ ] **Step 5: Commit**

```bash
git add src/features/organizer/components/RotationScoreboard.tsx src/app/(dashboard)/dashboard/tournaments/page.tsx
git commit -m "feat(ui): RotationScoreboard and Organizar quedada button in tournaments"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Migration adds `event_type`, `game_dynamic`, `guest_name`, `guest_lastname`, identity constraint — Task 1
- [x] `organizador_verificado` badge + OWNER/MANAGER/COACH role checked — Task 3 + 6
- [x] `canOrganize` used in nav, all pages, and API routes — Tasks 4, 6, 7
- [x] `GET/POST /api/quedadas` — Task 4
- [x] Guest player support in participants route — Task 5
- [x] `GET /api/users/search` — Task 4
- [x] OrganizerShell with tabs Mis Quedadas / Historial — Task 8
- [x] QuedadaWizard 3 steps (detalles → fecha/acceso → jugadores) — Task 9
- [x] QuedadaManagePanel tabs (Jugadores / Bracket / Invitación) — Task 10
- [x] AddPlayerModal with registered/guest toggle — Task 10
- [x] RotationScoreboard for King of Court / Popcorn — Task 11
- [x] BracketView reused for standard/round_robin — Task 10 (placeholder + note, BracketView integration deferred to bracket initiation)
- [x] Nav item "Mis Quedadas" conditional — Task 6
- [x] Tournaments page "Organizar quedada" button — Task 11
- [x] Routes `/dashboard/organizer`, `/dashboard/organizer/new`, `/dashboard/organizer/[id]` — Task 7
