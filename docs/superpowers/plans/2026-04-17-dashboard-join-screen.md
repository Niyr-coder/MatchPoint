# Dashboard Improvements + Join Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pending-invites banner and club activity feed to the dashboard, and create a public `/join/[code]` page with entity-specific hero cover designs.

**Architecture:** Dashboard gets two new server-fetched components wired into the existing `Promise.all` pattern. The Join screen is a new public route (`src/app/join/[code]`) outside the `(dashboard)` group that fetches entity data server-side and delegates the join action to a client component. The existing `/invite/[code]` route redirects to `/join/[code]`.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS 4 · Supabase · Vitest + @testing-library/react

---

## File Map

**Create:**
- `src/components/dashboard/PendingInvitesBanner.tsx` — banner showing pending reservation invites
- `src/components/dashboard/__tests__/PendingInvitesBanner.test.tsx`
- `src/components/dashboard/ClubActivityFeed.tsx` — renders activity items
- `src/components/dashboard/__tests__/ClubActivityFeed.test.tsx`
- `src/features/clubs/club-activity.ts` — server query: club activity items
- `src/features/clubs/__tests__/club-activity.test.ts`
- `src/features/memberships/join-preview.ts` — server function: invite + entity data
- `src/features/memberships/__tests__/join-preview.test.ts`
- `src/features/memberships/components/JoinPageClient.tsx` — client component: join action
- `src/features/memberships/components/__tests__/JoinPageClient.test.tsx`
- `src/app/join/[code]/page.tsx` — public Server Component

**Modify:**
- `src/features/bookings/components/ReservasPanel.tsx` — remove `inviteCount` prop
- `src/app/(dashboard)/dashboard/page.tsx` — add new components + reorder layout
- `src/app/invite/[code]/page.tsx` — add redirect to `/join/[code]`

---

## Task 1: PendingInvitesBanner component

**Files:**
- Create: `src/components/dashboard/__tests__/PendingInvitesBanner.test.tsx`
- Create: `src/components/dashboard/PendingInvitesBanner.tsx`

- [ ] **Step 1.1: Write the failing test**

```tsx
// src/components/dashboard/__tests__/PendingInvitesBanner.test.tsx
import { render, screen } from "@testing-library/react"
import { PendingInvitesBanner } from "../PendingInvitesBanner"
import type { ReservationInvite } from "@/features/bookings/types"

const base: ReservationInvite = {
  id: "inv-1",
  reservation_id: "res-1",
  invited_user_id: "user-1",
  status: "pending",
  created_at: "2026-04-17T10:00:00Z",
  reservations: {
    id: "res-1",
    court_id: "court-1",
    user_id: "host-1",
    date: "2026-04-25",
    start_time: "08:00:00",
    end_time: "09:00:00",
    status: "confirmed",
    total_price: 20,
    notes: null,
    created_at: "2026-04-17T10:00:00Z",
    updated_at: "2026-04-17T10:00:00Z",
  },
}

describe("PendingInvitesBanner", () => {
  it("renders nothing when invites is empty", () => {
    const { container } = render(<PendingInvitesBanner invites={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders singular text for one invite", () => {
    render(<PendingInvitesBanner invites={[base]} />)
    expect(screen.getByText(/1 invitación pendiente/i)).toBeInTheDocument()
  })

  it("renders plural text for multiple invites", () => {
    render(<PendingInvitesBanner invites={[base, { ...base, id: "inv-2" }]} />)
    expect(screen.getByText(/2 invitaciones pendientes/i)).toBeInTheDocument()
  })

  it("links to the reservations page", () => {
    render(<PendingInvitesBanner invites={[base]} />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard/reservations")
  })
})
```

- [ ] **Step 1.2: Run test — expect FAIL**

```bash
npx vitest run src/components/dashboard/__tests__/PendingInvitesBanner.test.tsx
```

Expected: `Cannot find module '../PendingInvitesBanner'`

- [ ] **Step 1.3: Implement PendingInvitesBanner**

```tsx
// src/components/dashboard/PendingInvitesBanner.tsx
"use client"

import Link from "next/link"
import type { ReservationInvite } from "@/features/bookings/types"

interface PendingInvitesBannerProps {
  invites: ReservationInvite[]
}

export function PendingInvitesBanner({ invites }: PendingInvitesBannerProps) {
  if (invites.length === 0) return null

  const count = invites.length
  const label =
    count === 1
      ? "1 invitación pendiente a una reserva"
      : `${count} invitaciones pendientes a reservas`

  return (
    <Link
      href="/dashboard/reservations"
      className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 hover:bg-slate-800 transition-colors"
    >
      <span className="size-2 rounded-full bg-amber-400 shrink-0" />
      <p className="text-sm font-semibold text-white flex-1">{label}</p>
      <span className="text-xs text-slate-400 shrink-0">Ver →</span>
    </Link>
  )
}
```

- [ ] **Step 1.4: Run test — expect PASS**

```bash
npx vitest run src/components/dashboard/__tests__/PendingInvitesBanner.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/components/dashboard/PendingInvitesBanner.tsx src/components/dashboard/__tests__/PendingInvitesBanner.test.tsx
git commit -m "feat(dashboard): add PendingInvitesBanner component"
```

---

## Task 2: getClubActivity server query

**Files:**
- Create: `src/features/clubs/__tests__/club-activity.test.ts`
- Create: `src/features/clubs/club-activity.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
// src/features/clubs/__tests__/club-activity.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

import { getClubActivity } from "../club-activity"

// Helper: builds a Supabase chainable query builder stub
function makeQueryBuilder(resolvedData: unknown) {
  const builder: Record<string, unknown> = {}
  const chainMethods = ["select", "in", "eq", "order", "limit"]
  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder["limit"] = vi.fn().mockResolvedValue({ data: resolvedData, error: null })
  return builder
}

describe("getClubActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty array when user has no club roles", async () => {
    // First from() call is for user_roles
    const rolesBuilder = makeQueryBuilder([])
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(rolesBuilder),
    })

    const result = await getClubActivity("user-1")
    expect(result).toEqual([])
  })

  it("returns merged activity items sorted by timestamp desc", async () => {
    const rolesBuilder = makeQueryBuilder([{ club_id: "club-1" }])
    const tournamentsBuilder = makeQueryBuilder([
      {
        id: "t-1",
        name: "Torneo Pádel",
        created_at: "2026-04-17T10:00:00Z",
        clubs: { name: "Club Norte" },
      },
    ])
    const membersBuilder = makeQueryBuilder([
      {
        id: "m-1",
        created_at: "2026-04-17T12:00:00Z",
        clubs: { name: "Club Norte" },
        profiles: { full_name: "Ana López" },
      },
    ])

    let callCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return rolesBuilder
        if (callCount === 2) return tournamentsBuilder
        return membersBuilder
      }),
    })

    const result = await getClubActivity("user-1")

    expect(result).toHaveLength(2)
    // member joined later → appears first
    expect(result[0].type).toBe("new_member")
    expect(result[0].title).toBe("Ana López se unió al club")
    expect(result[1].type).toBe("tournament_opened")
    expect(result[1].title).toBe('Torneo "Torneo Pádel" abierto')
  })

  it("returns at most 5 items", async () => {
    const rolesBuilder = makeQueryBuilder([{ club_id: "club-1" }])

    const manyTournaments = Array.from({ length: 4 }, (_, i) => ({
      id: `t-${i}`,
      name: `Torneo ${i}`,
      created_at: `2026-04-1${i}T10:00:00Z`,
      clubs: { name: "Club" },
    }))
    const manyMembers = Array.from({ length: 4 }, (_, i) => ({
      id: `m-${i}`,
      created_at: `2026-04-1${i}T12:00:00Z`,
      clubs: { name: "Club" },
      profiles: { full_name: `Member ${i}` },
    }))

    const tournamentsBuilder = makeQueryBuilder(manyTournaments)
    const membersBuilder = makeQueryBuilder(manyMembers)

    let callCount = 0
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return rolesBuilder
        if (callCount === 2) return tournamentsBuilder
        return membersBuilder
      }),
    })

    const result = await getClubActivity("user-1")
    expect(result.length).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2.2: Run test — expect FAIL**

```bash
npx vitest run src/features/clubs/__tests__/club-activity.test.ts
```

Expected: `Cannot find module '../club-activity'`

- [ ] **Step 2.3: Implement getClubActivity**

```ts
// src/features/clubs/club-activity.ts
import { createClient } from "@/lib/supabase/server"

export type ActivityType = "tournament_opened" | "new_member"

export interface ActivityItem {
  type: ActivityType
  title: string
  subtitle: string
  timestamp: string
  color: string
}

export async function getClubActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data: roles } = await supabase
    .from("user_roles")
    .select("club_id")
    .eq("user_id", userId)

  if (!roles?.length) return []

  const clubIds = roles.map((r: { club_id: string }) => r.club_id)

  const [tournamentsRes, membersRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name, created_at, clubs(name)")
      .in("club_id", clubIds)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("club_members")
      .select("id, created_at, clubs(name), profiles(full_name)")
      .in("club_id", clubIds)
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  const items: ActivityItem[] = []

  for (const t of (tournamentsRes.data ?? []) as Array<{
    name: string
    created_at: string
    clubs: { name: string } | null
  }>) {
    items.push({
      type: "tournament_opened",
      title: `Torneo "${t.name}" abierto`,
      subtitle: t.clubs?.name ?? "",
      timestamp: t.created_at,
      color: "#10b981",
    })
  }

  for (const m of (membersRes.data ?? []) as Array<{
    created_at: string
    clubs: { name: string } | null
    profiles: { full_name: string | null } | null
  }>) {
    items.push({
      type: "new_member",
      title: `${m.profiles?.full_name ?? "Nuevo miembro"} se unió al club`,
      subtitle: m.clubs?.name ?? "",
      timestamp: m.created_at,
      color: "#6366f1",
    })
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
}
```

- [ ] **Step 2.4: Run test — expect PASS**

```bash
npx vitest run src/features/clubs/__tests__/club-activity.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/features/clubs/club-activity.ts src/features/clubs/__tests__/club-activity.test.ts
git commit -m "feat(clubs): add getClubActivity server query"
```

---

## Task 3: ClubActivityFeed component

**Files:**
- Create: `src/components/dashboard/__tests__/ClubActivityFeed.test.tsx`
- Create: `src/components/dashboard/ClubActivityFeed.tsx`

- [ ] **Step 3.1: Write the failing test**

```tsx
// src/components/dashboard/__tests__/ClubActivityFeed.test.tsx
import { render, screen } from "@testing-library/react"
import { ClubActivityFeed } from "../ClubActivityFeed"
import type { ActivityItem } from "@/features/clubs/club-activity"

const items: ActivityItem[] = [
  {
    type: "tournament_opened",
    title: 'Torneo "Pádel Amateur" abierto',
    subtitle: "Club Norte",
    timestamp: "2026-04-17T10:00:00Z",
    color: "#10b981",
  },
  {
    type: "new_member",
    title: "Ana López se unió al club",
    subtitle: "Club Norte",
    timestamp: "2026-04-17T09:00:00Z",
    color: "#6366f1",
  },
]

describe("ClubActivityFeed", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<ClubActivityFeed items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders all activity items", () => {
    render(<ClubActivityFeed items={items} />)
    expect(screen.getByText('Torneo "Pádel Amateur" abierto')).toBeInTheDocument()
    expect(screen.getByText("Ana López se unió al club")).toBeInTheDocument()
  })

  it("renders subtitles", () => {
    render(<ClubActivityFeed items={items} />)
    expect(screen.getAllByText("Club Norte")).toHaveLength(2)
  })

  it("renders section heading", () => {
    render(<ClubActivityFeed items={items} />)
    expect(screen.getByText(/actividad del club/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3.2: Run test — expect FAIL**

```bash
npx vitest run src/components/dashboard/__tests__/ClubActivityFeed.test.tsx
```

Expected: `Cannot find module '../ClubActivityFeed'`

- [ ] **Step 3.3: Implement ClubActivityFeed**

```tsx
// src/components/dashboard/ClubActivityFeed.tsx
"use client"

import type { ActivityItem } from "@/features/clubs/club-activity"

interface ClubActivityFeedProps {
  items: ActivityItem[]
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export function ClubActivityFeed({ items }: ClubActivityFeedProps) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xs font-black uppercase tracking-tight text-zinc-400 mb-4">
        Actividad del Club
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="mt-1.5 size-1.5 rounded-full shrink-0"
              style={{ background: item.color }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {item.title}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {item.subtitle && `${item.subtitle} · `}
                {relativeTime(item.timestamp)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3.4: Run test — expect PASS**

```bash
npx vitest run src/components/dashboard/__tests__/ClubActivityFeed.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/dashboard/ClubActivityFeed.tsx src/components/dashboard/__tests__/ClubActivityFeed.test.tsx
git commit -m "feat(dashboard): add ClubActivityFeed component"
```

---

## Task 4: Wire dashboard page + fix ReservasPanel

**Files:**
- Modify: `src/features/bookings/components/ReservasPanel.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 4.1: Remove inviteCount from ReservasPanel**

In `src/features/bookings/components/ReservasPanel.tsx`, replace the interface and component signature:

```tsx
// REMOVE this interface:
interface ReservasPanelProps {
  reservations: Reservation[]
  inviteCount: number
}

// REPLACE with:
interface ReservasPanelProps {
  reservations: Reservation[]
}
```

And replace the footer section (lines 100–112):

```tsx
      {/* Footer */}
      <div className="px-6 py-3 border-t border-zinc-50">
        <Link href="/dashboard/reservations" className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600 hover:underline">
          Ver historial de reservas →
        </Link>
      </div>
```

And update the function signature:

```tsx
export function ReservasPanel({ reservations }: ReservasPanelProps) {
```

- [ ] **Step 4.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors (the only call site is dashboard/page.tsx which we update next).

- [ ] **Step 4.3: Update dashboard page**

Replace the full contents of `src/app/(dashboard)/dashboard/page.tsx`:

```tsx
import { authorizeOrRedirect } from "@/features/auth/queries"
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner"
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel"
import { PendingInvitesBanner } from "@/components/dashboard/PendingInvitesBanner"
import { ClubActivityFeed } from "@/components/dashboard/ClubActivityFeed"
import { ReservasPanel } from "@/features/bookings/components/ReservasPanel"
import { TorneosPanel } from "@/features/tournaments/components/TorneosPanel"
import { PickleballRatingWidget } from "@/features/users/components/PickleballRatingWidget"
import { MyBadgesSection } from "@/features/badges/components/MyBadgesSection"
import { getUpcomingReservations, getReservationInvites } from "@/features/bookings/queries"
import { getOpenTournaments } from "@/features/tournaments/queries"
import { getPlayerStats } from "@/features/users/queries"
import { getPlayerBadges } from "@/features/badges/queries"
import { getClubActivity } from "@/features/clubs/club-activity"
import { createClient } from "@/lib/supabase/server"
import type { PickleballProfile } from "@/types"

export default async function UserDashboardPage() {
  const ctx = await authorizeOrRedirect()
  const userId = ctx.userId

  const date = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const supabase = await createClient()

  const [reservations, invites, tournaments, stats, pickleballRes, badges, activity] =
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
      getClubActivity(userId),
    ])

  const pickleballProfile = (pickleballRes.data ?? null) as Pick<
    PickleballProfile,
    "singles_rating" | "doubles_rating" | "skill_level"
  > | null

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner profile={ctx.profile} date={date} stats={stats} />
      <PendingInvitesBanner invites={invites} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReservasPanel reservations={reservations} />
        <TorneosPanel tournaments={tournaments} />
      </div>
      <ClubActivityFeed items={activity} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PickleballRatingWidget profile={pickleballProfile} />
        <MyBadgesSection badges={badges} />
        <QuickActionsPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 4.4: Verify TypeScript and run all tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: zero type errors, all existing tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/features/bookings/components/ReservasPanel.tsx src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): wire PendingInvitesBanner, ClubActivityFeed, reorder layout"
```

---

## Task 5: fetchJoinPreview server function

**Files:**
- Create: `src/features/memberships/__tests__/join-preview.test.ts`
- Create: `src/features/memberships/join-preview.ts`

- [ ] **Step 5.1: Write the failing test**

```ts
// src/features/memberships/__tests__/join-preview.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

import { fetchJoinPreview } from "../join-preview"

function makeChain(resolvedValue: unknown) {
  const builder: Record<string, unknown> = {}
  for (const m of ["select", "eq", "in", "order", "limit", "single"]) {
    builder[m] = vi.fn().mockReturnValue(builder)
  }
  builder["maybeSingle"] = vi.fn().mockResolvedValue(resolvedValue)
  builder["single"] = vi.fn().mockResolvedValue(resolvedValue)
  return builder
}

describe("fetchJoinPreview", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns not_found when code does not exist", async () => {
    const inviteBuilder = makeChain({ data: null, error: null })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("bad-code")
    expect(result.status).toBe("not_found")
  })

  it("returns inactive status when invite is not active", async () => {
    const inviteBuilder = makeChain({
      data: {
        id: "inv-1",
        entity_type: "club",
        entity_id: "club-1",
        is_active: false,
        expires_at: null,
        uses_count: 0,
        max_uses: null,
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("inactive")
  })

  it("returns expired status when invite is past expires_at", async () => {
    const inviteBuilder = makeChain({
      data: {
        id: "inv-1",
        entity_type: "club",
        entity_id: "club-1",
        is_active: true,
        expires_at: "2020-01-01T00:00:00Z",
        uses_count: 0,
        max_uses: null,
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("expired")
  })

  it("returns exhausted when uses_count >= max_uses", async () => {
    const inviteBuilder = makeChain({
      data: {
        id: "inv-1",
        entity_type: "club",
        entity_id: "club-1",
        is_active: true,
        expires_at: null,
        uses_count: 5,
        max_uses: 5,
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(inviteBuilder),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("exhausted")
  })

  it("returns valid with club entity data", async () => {
    const inviteData = {
      id: "inv-1",
      entity_type: "club",
      entity_id: "club-1",
      is_active: true,
      expires_at: null,
      uses_count: 1,
      max_uses: null,
    }
    const clubData = {
      id: "club-1",
      name: "Club Quito Norte",
      city: "Quito",
      description: "Un club deportivo.",
    }

    let callCount = 0
    const inviteBuilder = makeChain({ data: inviteData, error: null })
    const clubBuilder = makeChain({ data: clubData, error: null })

    mockCreateClient.mockResolvedValue({
      from: vi.fn().mockImplementation(() => {
        callCount++
        return callCount === 1 ? inviteBuilder : clubBuilder
      }),
    })

    const result = await fetchJoinPreview("code-1")
    expect(result.status).toBe("valid")
    expect(result.entity.name).toBe("Club Quito Norte")
    expect(result.entity_type).toBe("club")
  })
})
```

- [ ] **Step 5.2: Run test — expect FAIL**

```bash
npx vitest run src/features/memberships/__tests__/join-preview.test.ts
```

Expected: `Cannot find module '../join-preview'`

- [ ] **Step 5.3: Implement fetchJoinPreview**

```ts
// src/features/memberships/join-preview.ts
import { createClient } from "@/lib/supabase/server"
import type { InviteEntityType } from "./actions"

export type JoinPreviewStatus = "valid" | "expired" | "inactive" | "exhausted" | "not_found"

export interface EntityPreviewData {
  name: string
  subtitle: string
  description: string | null
  gradient: string
  cta_text: string
  cta_sub: string | null
  stats: Array<{ label: string; value: string }>
}

export interface JoinPreview {
  code: string
  entity_type: InviteEntityType
  status: JoinPreviewStatus
  entity: EntityPreviewData
}

const GRADIENTS: Record<InviteEntityType, string> = {
  club:        "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
  tournament:  "linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)",
  reservation: "linear-gradient(135deg, #065f46 0%, #0f172a 100%)",
  team:        "linear-gradient(135deg, #9a3412 0%, #1c1917 100%)",
  event:       "linear-gradient(135deg, #c2410c 0%, #1c1917 100%)",
  coach_class: "linear-gradient(135deg, #0369a1 0%, #0f172a 100%)",
}

const CTA_TEXTS: Record<InviteEntityType, string> = {
  club:        "Unirme al club",
  tournament:  "Inscribirme al torneo",
  reservation: "Aceptar invitación",
  team:        "Unirme al equipo",
  event:       "Registrarme al evento",
  coach_class: "Unirme a la clase",
}

const FALLBACK_ENTITY: EntityPreviewData = {
  name: "Invitación",
  subtitle: "MATCHPOINT",
  description: null,
  gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  cta_text: "Aceptar invitación",
  cta_sub: null,
  stats: [],
}

async function fetchClubEntity(supabase: Awaited<ReturnType<typeof createClient>>, entityId: string): Promise<EntityPreviewData> {
  const { data } = await supabase
    .from("clubs")
    .select("name, city, description")
    .eq("id", entityId)
    .maybeSingle()

  if (!data) return FALLBACK_ENTITY

  const club = data as { name: string; city: string | null; description: string | null }
  return {
    name: club.name,
    subtitle: club.city ?? "Ecuador",
    description: club.description,
    gradient: GRADIENTS.club,
    cta_text: CTA_TEXTS.club,
    cta_sub: null,
    stats: [],
  }
}

async function fetchTournamentEntity(supabase: Awaited<ReturnType<typeof createClient>>, entityId: string): Promise<EntityPreviewData> {
  const { data } = await supabase
    .from("tournaments")
    .select("name, start_date, end_date, max_participants, entry_fee, game_dynamic, clubs(name)")
    .eq("id", entityId)
    .maybeSingle()

  if (!data) return FALLBACK_ENTITY

  const t = data as {
    name: string
    start_date: string | null
    end_date: string | null
    max_participants: number | null
    entry_fee: number | null
    game_dynamic: string | null
    clubs: { name: string } | null
  }

  const dateRange = t.start_date
    ? new Date(t.start_date).toLocaleDateString("es-EC", { day: "numeric", month: "short" })
    : null

  return {
    name: t.name,
    subtitle: [t.clubs?.name, dateRange].filter(Boolean).join(" · "),
    description: t.game_dynamic ?? null,
    gradient: GRADIENTS.tournament,
    cta_text: CTA_TEXTS.tournament,
    cta_sub: t.max_participants ? `${t.max_participants} cupos disponibles` : null,
    stats: [
      ...(t.max_participants ? [{ label: "Cupos", value: String(t.max_participants) }] : []),
      ...(t.entry_fee ? [{ label: "Fee", value: `$${t.entry_fee}` }] : []),
      ...(t.start_date ? [{ label: "Inicio", value: dateRange ?? "" }] : []),
    ],
  }
}

async function fetchReservationEntity(supabase: Awaited<ReturnType<typeof createClient>>, entityId: string): Promise<EntityPreviewData> {
  const { data } = await supabase
    .from("reservations")
    .select("date, start_time, end_time, user_id, courts(name, sport, clubs(name)), profiles(full_name)")
    .eq("id", entityId)
    .maybeSingle()

  if (!data) return FALLBACK_ENTITY

  const r = data as {
    date: string
    start_time: string
    end_time: string
    courts: { name: string; sport: string; clubs: { name: string } | null } | null
    profiles: { full_name: string | null } | null
  }

  const dateLabel = new Date(r.date + "T12:00:00").toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

  const startH = r.start_time.slice(0, 5)
  const endH = r.end_time.slice(0, 5)

  return {
    name: "Te invitan a jugar",
    subtitle: [r.courts?.name, r.courts?.clubs?.name].filter(Boolean).join(" · "),
    description: r.profiles?.full_name ? `Invitado por ${r.profiles.full_name}` : null,
    gradient: GRADIENTS.reservation,
    cta_text: CTA_TEXTS.reservation,
    cta_sub: null,
    stats: [
      { label: "Fecha", value: dateLabel },
      { label: "Hora", value: `${startH} – ${endH}` },
      { label: "Deporte", value: r.courts?.sport ?? "" },
    ],
  }
}

export async function fetchJoinPreview(code: string): Promise<JoinPreview> {
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from("invite_links")
    .select("id, entity_type, entity_id, is_active, expires_at, uses_count, max_uses")
    .eq("code", code)
    .maybeSingle()

  const entityType: InviteEntityType = (invite?.entity_type as InviteEntityType) ?? "club"

  if (!invite) {
    return { code, entity_type: entityType, status: "not_found", entity: FALLBACK_ENTITY }
  }

  if (!invite.is_active) {
    return { code, entity_type: entityType, status: "inactive", entity: FALLBACK_ENTITY }
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { code, entity_type: entityType, status: "expired", entity: FALLBACK_ENTITY }
  }

  if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
    return { code, entity_type: entityType, status: "exhausted", entity: FALLBACK_ENTITY }
  }

  const entityFetchers: Record<InviteEntityType, () => Promise<EntityPreviewData>> = {
    club:        () => fetchClubEntity(supabase, invite.entity_id),
    tournament:  () => fetchTournamentEntity(supabase, invite.entity_id),
    reservation: () => fetchReservationEntity(supabase, invite.entity_id),
    team:        async () => ({ ...FALLBACK_ENTITY, gradient: GRADIENTS.team, cta_text: CTA_TEXTS.team }),
    event:       async () => ({ ...FALLBACK_ENTITY, gradient: GRADIENTS.event, cta_text: CTA_TEXTS.event }),
    coach_class: async () => ({ ...FALLBACK_ENTITY, gradient: GRADIENTS.coach_class, cta_text: CTA_TEXTS.coach_class }),
  }

  const entity = await entityFetchers[entityType]()
  return { code, entity_type: entityType, status: "valid", entity }
}
```

- [ ] **Step 5.4: Run test — expect PASS**

```bash
npx vitest run src/features/memberships/__tests__/join-preview.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/features/memberships/join-preview.ts src/features/memberships/__tests__/join-preview.test.ts
git commit -m "feat(memberships): add fetchJoinPreview server function"
```

---

## Task 6: JoinPageClient component

**Files:**
- Create: `src/features/memberships/components/__tests__/JoinPageClient.test.tsx`
- Create: `src/features/memberships/components/JoinPageClient.tsx`

- [ ] **Step 6.1: Write the failing test**

```tsx
// src/features/memberships/components/__tests__/JoinPageClient.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { JoinPageClient } from "../JoinPageClient"
import type { JoinPreview } from "../../join-preview"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))

const validPreview: JoinPreview = {
  code: "abc123",
  entity_type: "club",
  status: "valid",
  entity: {
    name: "Club Quito Norte",
    subtitle: "Quito",
    description: "Un club deportivo.",
    gradient: "linear-gradient(135deg, #1e3a5f, #0f172a)",
    cta_text: "Unirme al club",
    cta_sub: null,
    stats: [{ label: "Miembros", value: "248" }],
  },
}

describe("JoinPageClient", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders entity name and CTA when valid and authenticated", () => {
    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    expect(screen.getByText("Club Quito Norte")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /unirme al club/i })).toBeInTheDocument()
  })

  it("renders login CTA when not authenticated", () => {
    render(<JoinPageClient preview={validPreview} isAuthenticated={false} />)
    expect(screen.getByRole("link", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("login link includes next param pointing to the join page", () => {
    render(<JoinPageClient preview={validPreview} isAuthenticated={false} />)
    const link = screen.getByRole("link", { name: /iniciar sesión/i })
    expect(link).toHaveAttribute("href", "/login?next=/join/abc123")
  })

  it("renders expired message when status is expired", () => {
    render(
      <JoinPageClient
        preview={{ ...validPreview, status: "expired" }}
        isAuthenticated={true}
      />,
    )
    expect(screen.getByText(/expirado/i)).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("renders inactive message when status is inactive", () => {
    render(
      <JoinPageClient
        preview={{ ...validPreview, status: "inactive" }}
        isAuthenticated={true}
      />,
    )
    expect(screen.getByText(/desactivad/i)).toBeInTheDocument()
  })

  it("calls redeem API on CTA click and shows loading state", async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { entity_type: "club", entity_id: "club-1" } }),
    })

    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    await user.click(screen.getByRole("button", { name: /unirme al club/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/invites/redeem",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("shows success message after successful join", async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { entity_type: "club", entity_id: "club-1" } }),
    })

    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    await user.click(screen.getByRole("button", { name: /unirme al club/i }))

    expect(await screen.findByText(/te has unido/i)).toBeInTheDocument()
  })

  it("shows error message on failed join", async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "No autorizado" }),
    })

    render(<JoinPageClient preview={validPreview} isAuthenticated={true} />)
    await user.click(screen.getByRole("button", { name: /unirme al club/i }))

    expect(await screen.findByText(/no autorizado/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6.2: Run test — expect FAIL**

```bash
npx vitest run src/features/memberships/components/__tests__/JoinPageClient.test.tsx
```

Expected: `Cannot find module '../JoinPageClient'`

- [ ] **Step 6.3: Implement JoinPageClient**

```tsx
// src/features/memberships/components/JoinPageClient.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { JoinPreview } from "../join-preview"

interface JoinPageClientProps {
  preview: JoinPreview
  isAuthenticated: boolean
}

type State = "idle" | "loading" | "success" | "error"

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  expired:   { title: "Invitación expirada",    body: "Este enlace ya no es válido." },
  inactive:  { title: "Invitación desactivada", body: "El creador desactivó este enlace." },
  exhausted: { title: "Sin cupos disponibles",  body: "Este enlace alcanzó su límite de usos." },
  not_found: { title: "Invitación no encontrada", body: "El enlace no existe o fue eliminado." },
}

export function JoinPageClient({ preview, isAuthenticated }: JoinPageClientProps) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { entity, status, code, entity_type } = preview
  const terminal = STATUS_MESSAGES[status]

  async function handleJoin() {
    setState("loading")
    try {
      const res = await fetch("/api/invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? "Error al procesar la invitación.")
        setState("error")
        return
      }
      setState("success")
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.")
      setState("error")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Hero */}
        <div
          className="h-28 flex items-end px-5 py-4 relative"
          style={{ background: entity.gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1 block">
              {entity_type.replace("_", " ")}
            </span>
            <h1 className="text-xl font-black text-white leading-tight">{entity.name}</h1>
            {entity.subtitle && (
              <p className="text-xs text-white/70 mt-0.5">{entity.subtitle}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {entity.stats.length > 0 && (
          <div className="flex divide-x divide-border border-b border-border">
            {entity.stats.map((s) => (
              <div key={s.label} className="flex-1 py-3 text-center">
                <p className="text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 bg-card">
          {entity.description && (
            <p className="text-sm text-zinc-500 leading-relaxed">{entity.description}</p>
          )}

          {/* Terminal states */}
          {terminal ? (
            <div className="rounded-lg bg-zinc-100 px-4 py-3 text-center">
              <p className="text-sm font-bold text-zinc-700">{terminal.title}</p>
              <p className="text-xs text-zinc-400 mt-1">{terminal.body}</p>
            </div>
          ) : !isAuthenticated ? (
            <Link
              href={`/login?next=/join/${code}`}
              className="block w-full rounded-xl bg-foreground py-3 text-center text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              Iniciar sesión para unirte
            </Link>
          ) : state === "success" ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center">
              <p className="text-sm font-bold text-green-700">¡Te has unido exitosamente!</p>
              <p className="text-xs text-green-500 mt-1">Redirigiendo al dashboard…</p>
            </div>
          ) : state === "error" ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-center">
                <p className="text-xs text-red-600">{errorMsg}</p>
              </div>
              <button
                onClick={() => setState("idle")}
                className="text-xs text-zinc-400 underline"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              disabled={state === "loading"}
              className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              {state === "loading" ? "Procesando…" : entity.cta_text}
            </button>
          )}

          {entity.cta_sub && state === "idle" && (
            <p className="text-[11px] text-zinc-400 text-center">{entity.cta_sub}</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6.4: Run test — expect PASS**

```bash
npx vitest run src/features/memberships/components/__tests__/JoinPageClient.test.tsx
```

Expected: 8 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/features/memberships/components/JoinPageClient.tsx src/features/memberships/components/__tests__/JoinPageClient.test.tsx
git commit -m "feat(memberships): add JoinPageClient component"
```

---

## Task 7: /join/[code] page + redirect from /invite/[code]

**Files:**
- Create: `src/app/join/[code]/page.tsx`
- Modify: `src/app/invite/[code]/page.tsx`

- [ ] **Step 7.1: Create the public join page**

```tsx
// src/app/join/[code]/page.tsx
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { fetchJoinPreview } from "@/features/memberships/join-preview"
import { JoinPageClient } from "@/features/memberships/components/JoinPageClient"
import { createClient } from "@/lib/supabase/server"
import { SITE_NAME } from "@/lib/constants"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const preview = await fetchJoinPreview(code)
  if (preview.status === "not_found") {
    return { title: `Invitación — ${SITE_NAME}` }
  }
  return {
    title: `${preview.entity.name} — ${SITE_NAME}`,
    description: preview.entity.description ?? `Únete a ${preview.entity.name} en ${SITE_NAME}`,
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const [preview, userId] = await Promise.all([
    fetchJoinPreview(code),
    getAuthenticatedUserId(),
  ])

  if (preview.status === "not_found") notFound()

  return (
    <JoinPageClient
      preview={preview}
      isAuthenticated={userId !== null}
    />
  )
}
```

- [ ] **Step 7.2: Add redirect from /invite/[code] to /join/[code]**

At the top of `src/app/invite/[code]/page.tsx`, add the redirect import and replace the export default function with a redirect:

```tsx
// Add to top of file after existing imports:
import { redirect } from "next/navigation"

// Replace the entire export default async function InvitePage block with:
export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  redirect(`/join/${code}`)
}
```

Keep the `generateMetadata` and other helpers or remove them — they are no longer used. The safest edit is to replace only the `export default` function.

- [ ] **Step 7.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7.4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass, including the 93 pre-existing tests.

- [ ] **Step 7.5: Commit**

```bash
git add src/app/join/ src/app/invite/[code]/page.tsx
git commit -m "feat(memberships): add /join/[code] public page, redirect /invite to /join"
```

---

## Done

All tasks complete when:
- `npx tsc --noEmit` → zero errors
- `npx vitest run` → all tests pass (new + existing 93)
- Dashboard shows PendingInvitesBanner (hidden when no invites) and ClubActivityFeed
- `/join/abc123` renders the hero cover page for the entity type
- `/invite/abc123` redirects to `/join/abc123`
