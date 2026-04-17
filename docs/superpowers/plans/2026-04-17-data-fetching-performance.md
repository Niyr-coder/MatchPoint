# Data Fetching Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar TanStack Query v5 con prefetch desde servidor para eliminar spinners de carga en dashboards de torneos, reservas y perfil, y agregar paginación a las vistas admin.

**Architecture:** El Server Component prefetchea datos usando las queries existentes de Supabase, los serializa vía `HydrationBoundary`, y el Client Component los recibe ya listos. En navegaciones posteriores, TanStack sirve desde memoria (instantáneo) y refresca en background. Las mutaciones usan optimistic updates para feedback inmediato.

**Tech Stack:** TanStack Query v5 (`@tanstack/react-query`), Next.js 16 App Router, React 19, Vitest + Testing Library (ya instalados)

---

## File Map

### Nuevos
- `src/lib/query/client.ts` — `makeQueryClient()` y singleton de cliente
- `src/lib/query/keys.ts` — query key factory centralizada
- `src/lib/query/provider.tsx` — `QueryClientProvider` + `HydrationBoundary` wrapper
- `src/features/tournaments/hooks.ts` — `useOpenTournaments`, `useMyTournaments`, `useJoinTournament`
- `src/features/tournaments/prefetch.ts` — helpers de prefetch para server components
- `src/features/bookings/hooks.ts` — `useUserReservations`, `useReservationInvites`, `useCancelReservation`
- `src/features/bookings/prefetch.ts` — helpers de prefetch para server components
- `src/features/users/prefetch.ts` — helpers de prefetch para profile
- `src/lib/query/__tests__/keys.test.ts` — tests de query keys

### Modificados
- `src/app/layout.tsx` — agregar `QueryProvider`
- `src/app/(dashboard)/dashboard/tournaments/page.tsx` — patrón prefetch + `HydrationBoundary`
- `src/app/(dashboard)/dashboard/reservations/page.tsx` — patrón prefetch + `HydrationBoundary`
- `src/app/(dashboard)/dashboard/profile/page.tsx` — patrón prefetch + `HydrationBoundary`

---

## Task 1: Instalar TanStack Query

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar dependencias**

```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

- [ ] **Step 2: Verificar instalación**

```bash
node -e "require('@tanstack/react-query'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Verificar build no roto**

```bash
pnpm build 2>&1 | tail -5
```

Expected: sin errores de TypeScript ni de build.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @tanstack/react-query v5"
```

---

## Task 2: Query Client singleton

**Files:**
- Create: `src/lib/query/client.ts`
- Create: `src/lib/query/__tests__/client.test.ts`

- [ ] **Step 1: Escribir el test**

Crear `src/lib/query/__tests__/client.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

// Reset module entre tests para limpiar el singleton
beforeEach(() => {
  vi.resetModules()
})

describe('makeQueryClient', () => {
  it('returns a QueryClient instance', async () => {
    const { makeQueryClient } = await import('../client')
    const client = makeQueryClient()
    expect(client).toBeInstanceOf(QueryClient)
  })

  it('has staleTime of 60 seconds', async () => {
    const { makeQueryClient } = await import('../client')
    const client = makeQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.staleTime).toBe(60_000)
  })

  it('has gcTime of 5 minutes', async () => {
    const { makeQueryClient } = await import('../client')
    const client = makeQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.gcTime).toBe(300_000)
  })

  it('browser singleton returns same instance on repeated calls', async () => {
    const { getBrowserClient } = await import('../client')
    const a = getBrowserClient()
    const b = getBrowserClient()
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
pnpm vitest run src/lib/query/__tests__/client.test.ts
```

Expected: FAIL — `Cannot find module '../client'`

- [ ] **Step 3: Implementar `src/lib/query/client.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
      },
    },
  })
}

let browserClient: QueryClient | undefined

export function getBrowserClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserClient) {
    browserClient = makeQueryClient()
  }
  return browserClient
}
```

- [ ] **Step 4: Ejecutar test para verificar que pasa**

```bash
pnpm vitest run src/lib/query/__tests__/client.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/query/client.ts src/lib/query/__tests__/client.test.ts
git commit -m "feat(query): add QueryClient singleton with stale/gc config"
```

---

## Task 3: Query Key Factory

**Files:**
- Create: `src/lib/query/keys.ts`
- Create: `src/lib/query/__tests__/keys.test.ts`

- [ ] **Step 1: Escribir tests**

Crear `src/lib/query/__tests__/keys.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { tournamentKeys, bookingKeys, profileKeys, adminKeys } from '../keys'

describe('tournamentKeys', () => {
  it('all returns base key', () => {
    expect(tournamentKeys.all()).toEqual(['tournaments'])
  })

  it('open is nested under all', () => {
    expect(tournamentKeys.open()).toEqual(['tournaments', 'open'])
  })

  it('mine includes userId', () => {
    expect(tournamentKeys.mine('uid-1')).toEqual(['tournaments', 'mine', 'uid-1'])
  })

  it('detail includes id', () => {
    expect(tournamentKeys.detail('t-1')).toEqual(['tournaments', 't-1'])
  })
})

describe('bookingKeys', () => {
  it('user includes userId', () => {
    expect(bookingKeys.user('uid-1')).toEqual(['bookings', 'user', 'uid-1'])
  })

  it('invites includes userId', () => {
    expect(bookingKeys.invites('uid-1')).toEqual(['bookings', 'invites', 'uid-1'])
  })
})

describe('profileKeys', () => {
  it('stats includes userId', () => {
    expect(profileKeys.stats('uid-1')).toEqual(['profile', 'stats', 'uid-1'])
  })
})

describe('adminKeys', () => {
  it('users returns base key', () => {
    expect(adminKeys.users()).toEqual(['admin', 'users'])
  })

  it('tournaments returns base key', () => {
    expect(adminKeys.tournaments()).toEqual(['admin', 'tournaments'])
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
pnpm vitest run src/lib/query/__tests__/keys.test.ts
```

Expected: FAIL — `Cannot find module '../keys'`

- [ ] **Step 3: Implementar `src/lib/query/keys.ts`**

```typescript
export const tournamentKeys = {
  all: () => ['tournaments'] as const,
  open: () => ['tournaments', 'open'] as const,
  mine: (userId: string) => ['tournaments', 'mine', userId] as const,
  detail: (id: string) => ['tournaments', id] as const,
}

export const bookingKeys = {
  all: () => ['bookings'] as const,
  user: (userId: string) => ['bookings', 'user', userId] as const,
  invites: (userId: string) => ['bookings', 'invites', userId] as const,
}

export const profileKeys = {
  all: () => ['profile'] as const,
  stats: (userId: string) => ['profile', 'stats', userId] as const,
  roles: (userId: string) => ['profile', 'roles', userId] as const,
}

export const adminKeys = {
  all: () => ['admin'] as const,
  users: () => ['admin', 'users'] as const,
  tournaments: () => ['admin', 'tournaments'] as const,
}
```

- [ ] **Step 4: Ejecutar test para verificar que pasa**

```bash
pnpm vitest run src/lib/query/__tests__/keys.test.ts
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/query/keys.ts src/lib/query/__tests__/keys.test.ts
git commit -m "feat(query): add query key factory for all domains"
```

---

## Task 4: QueryClientProvider

**Files:**
- Create: `src/lib/query/provider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Crear `src/lib/query/provider.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getBrowserClient } from './client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getBrowserClient())

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Agregar `QueryProvider` a `src/app/layout.tsx`**

Modificar el return de `RootLayout`. Antes:

```typescript
  return (
    <html
      lang="es"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-card text-foreground antialiased">
        {children}
      </body>
    </html>
  )
```

Después (agregar import y wrapper):

```typescript
import { QueryProvider } from '@/lib/query/provider'

// ... (resto del archivo sin cambios hasta el return)

  return (
    <html
      lang="es"
      className={`${inter.variable} ${plusJakartaSans.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-card text-foreground antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
```

- [ ] **Step 3: Verificar que la app inicia sin errores**

```bash
pnpm dev 2>&1 | head -20
```

Expected: `✓ Ready` sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/lib/query/provider.tsx src/app/layout.tsx
git commit -m "feat(query): add QueryProvider to root layout"
```

---

## Task 5: Torneos — hooks y prefetch

**Files:**
- Create: `src/features/tournaments/hooks.ts`
- Create: `src/features/tournaments/prefetch.ts`

- [ ] **Step 1: Crear `src/features/tournaments/prefetch.ts`**

```typescript
import type { QueryClient } from '@tanstack/react-query'
import { tournamentKeys } from '@/lib/query/keys'
import { getOpenTournaments, getCreatedTournaments } from './queries'

export async function prefetchTournamentsList(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: tournamentKeys.open(),
      queryFn: getOpenTournaments,
    }),
    queryClient.prefetchQuery({
      queryKey: tournamentKeys.mine(userId),
      queryFn: () => getCreatedTournaments(userId),
    }),
  ])
}
```

- [ ] **Step 2: Crear `src/features/tournaments/hooks.ts`**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentKeys } from '@/lib/query/keys'
import type { Tournament } from './types'

async function fetchOpenTournaments(): Promise<Tournament[]> {
  const res = await fetch('/api/tournaments?status=open&limit=20')
  if (!res.ok) throw new Error('Error cargando torneos')
  const json = await res.json()
  return json.data ?? []
}

async function fetchMyTournaments(userId: string): Promise<Tournament[]> {
  const res = await fetch(`/api/tournaments?created_by=${userId}&limit=20`)
  if (!res.ok) throw new Error('Error cargando mis torneos')
  const json = await res.json()
  return json.data ?? []
}

async function joinTournament(tournamentId: string): Promise<void> {
  const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
    method: 'POST',
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Error al unirse')
  }
}

export function useOpenTournaments() {
  return useQuery({
    queryKey: tournamentKeys.open(),
    queryFn: fetchOpenTournaments,
  })
}

export function useMyTournaments(userId: string) {
  return useQuery({
    queryKey: tournamentKeys.mine(userId),
    queryFn: () => fetchMyTournaments(userId),
    enabled: Boolean(userId),
  })
}

export function useJoinTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: joinTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all() })
    },
  })
}
```

- [ ] **Step 3: Verificar tipos**

```bash
pnpm tsc --noEmit 2>&1 | grep "tournaments"
```

Expected: sin errores en archivos de tournaments.

- [ ] **Step 4: Commit**

```bash
git add src/features/tournaments/hooks.ts src/features/tournaments/prefetch.ts
git commit -m "feat(tournaments): add TanStack Query hooks and prefetch helpers"
```

---

## Task 6: Migrar página de torneos

**Files:**
- Modify: `src/app/(dashboard)/dashboard/tournaments/page.tsx`

La página actual hace todo el fetch directamente y renderiza el HTML. Vamos a extraer la UI a un Client Component y hacer prefetch en el Server Component.

- [ ] **Step 1: Extraer componente cliente**

Crear `src/features/tournaments/components/TournamentsPageClient.tsx`:

```typescript
'use client'

import { useOpenTournaments, useMyTournaments } from '../hooks'
import Link from 'next/link'
import { Trophy, Users } from 'lucide-react'

const SPORT_LABEL: Record<string, string> = {
  futbol: 'Fútbol',
  padel: 'Pádel',
  tenis: 'Tenis',
  pickleball: 'Pickleball',
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  draft:       { label: 'Borrador',   classes: 'bg-muted text-zinc-400 border-zinc-200' },
  open:        { label: 'Abierto',    classes: 'bg-success text-primary border-success-border' },
  in_progress: { label: 'En curso',   classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed:   { label: 'Completado', classes: 'bg-muted text-zinc-500 border-zinc-200' },
  cancelled:   { label: 'Cancelado',  classes: 'bg-red-50 text-red-600 border-red-200' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  userId: string
}

export function TournamentsPageClient({ userId }: Props) {
  const { data: openTournaments = [] } = useOpenTournaments()
  const { data: myTournaments = [] } = useMyTournaments(userId)

  return (
    <div className="flex flex-col gap-8">
      {myTournaments.length > 0 && (
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
            Mis Torneos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTournaments.map((t) => {
              const st = STATUS_STYLES[t.status] ?? STATUS_STYLES.open
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="rounded-2xl bg-card border border-foreground/30 p-5 flex flex-col gap-3 hover:border-foreground transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{formatDate(t.start_date)}</span>
                  </div>
                  <h3 className="text-sm font-black text-foreground leading-tight">{t.name}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      <span>{t.max_participants ? `${t.max_participants} cupos` : 'Sin límite'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <span className="text-[11px] font-black text-foreground uppercase tracking-wide">Ver Detalles →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Torneos Abiertos
        </h2>
        {openTournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-border rounded-2xl">
            <Trophy className="size-10 text-zinc-300" />
            <p className="text-sm font-bold text-zinc-400">No hay torneos abiertos</p>
            <Link href="/dashboard/tournaments/create" className="text-[11px] font-black text-foreground hover:underline">
              Crea el primero →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openTournaments.map((t) => {
              const st = STATUS_STYLES[t.status] ?? STATUS_STYLES.open
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tournaments/${t.id}`}
                  className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3 hover:border-foreground/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.classes}`}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{formatDate(t.start_date)}</span>
                  </div>
                  <h3 className="text-sm font-black text-foreground leading-tight">{t.name}</h3>
                  {t.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{SPORT_LABEL[t.sport] ?? t.sport}</span>
                    {t.clubs && <><span>·</span><span>{t.clubs.name}</span></>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Users className="size-3" />
                      <span>{t.max_participants} cupos</span>
                    </div>
                    <span className="text-[11px] font-black text-foreground">
                      {t.entry_fee > 0 ? `$${t.entry_fee}` : 'Gratis'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <span className="text-[11px] font-black text-foreground uppercase tracking-wide">Ver Detalles →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar `src/app/(dashboard)/dashboard/tournaments/page.tsx`**

Reemplazar el contenido completo con:

```typescript
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { authorizeOrRedirect } from '@/features/auth/queries'
import { makeQueryClient } from '@/lib/query/client'
import { prefetchTournamentsList } from '@/features/tournaments/prefetch'
import { PageHeader } from '@/components/shared/PageHeader'
import { TournamentsPageClient } from '@/features/tournaments/components/TournamentsPageClient'
import { Swords, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TournamentsPage() {
  const ctx = await authorizeOrRedirect()
  const { canOrganize } = await import('@/features/organizer/permissions')
  const isOrganizer = await canOrganize(ctx)

  const queryClient = makeQueryClient()
  await prefetchTournamentsList(queryClient, ctx.userId)

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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TournamentsPageClient userId={ctx.userId} />
      </HydrationBoundary>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(tournaments|TournamentsPage)"
```

Expected: sin errores.

- [ ] **Step 4: Verificar que la página carga**

```bash
pnpm dev
```

Navegar a `/dashboard/tournaments` — la página debe mostrar los torneos sin spinner inicial.

- [ ] **Step 5: Commit**

```bash
git add src/features/tournaments/components/TournamentsPageClient.tsx src/app/(dashboard)/dashboard/tournaments/page.tsx
git commit -m "feat(tournaments): migrate to TanStack Query prefetch pattern"
```

---

## Task 7: Reservas — hooks, prefetch y migración

**Files:**
- Create: `src/features/bookings/hooks.ts`
- Create: `src/features/bookings/prefetch.ts`
- Modify: `src/app/(dashboard)/dashboard/reservations/page.tsx`

- [ ] **Step 1: Crear `src/features/bookings/prefetch.ts`**

```typescript
import type { QueryClient } from '@tanstack/react-query'
import { bookingKeys } from '@/lib/query/keys'
import { getAllUserReservations, getReservationInvites } from './queries'

export async function prefetchUserBookings(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: bookingKeys.user(userId),
      queryFn: () => getAllUserReservations(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: bookingKeys.invites(userId),
      queryFn: () => getReservationInvites(userId),
    }),
  ])
}
```

- [ ] **Step 2: Crear `src/features/bookings/hooks.ts`**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingKeys } from '@/lib/query/keys'

async function fetchUserReservations(userId: string) {
  const res = await fetch(`/api/reservations?user_id=${userId}`)
  if (!res.ok) throw new Error('Error cargando reservas')
  const json = await res.json()
  return json.data ?? []
}

async function fetchReservationInvites(userId: string) {
  const res = await fetch(`/api/reservations/invites?user_id=${userId}`)
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

async function cancelReservation(reservationId: string): Promise<void> {
  const res = await fetch(`/api/reservations/${reservationId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Error al cancelar')
  }
}

export function useUserReservations(userId: string) {
  return useQuery({
    queryKey: bookingKeys.user(userId),
    queryFn: () => fetchUserReservations(userId),
    enabled: Boolean(userId),
  })
}

export function useReservationInvites(userId: string) {
  return useQuery({
    queryKey: bookingKeys.invites(userId),
    queryFn: () => fetchReservationInvites(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useCancelReservation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelReservation,
    onMutate: async (reservationId: string) => {
      await queryClient.cancelQueries({ queryKey: bookingKeys.user(userId) })
      const previous = queryClient.getQueryData(bookingKeys.user(userId))
      queryClient.setQueryData(bookingKeys.user(userId), (old: unknown[]) =>
        (old ?? []).filter((r: { id: string }) => r.id !== reservationId)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bookingKeys.user(userId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.user(userId) })
    },
  })
}
```

- [ ] **Step 3: Actualizar `src/app/(dashboard)/dashboard/reservations/page.tsx`**

Reemplazar contenido completo:

```typescript
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import Link from 'next/link'
import { authorizeOrRedirect } from '@/features/auth/queries'
import { makeQueryClient } from '@/lib/query/client'
import { prefetchUserBookings } from '@/features/bookings/prefetch'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReservationsPageClient } from '@/features/bookings/components/ReservationsPageClient'

export default async function ReservationsPage() {
  const ctx = await authorizeOrRedirect()

  const queryClient = makeQueryClient()
  await prefetchUserBookings(queryClient, ctx.userId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        label="Mis Reservas"
        title="Reservas"
        action={
          <Link
            href="/dashboard/reservations/new"
            className="bg-foreground text-background rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] hover:bg-foreground/90 transition-colors"
          >
            + Nueva Reserva
          </Link>
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ReservationsPageClient userId={ctx.userId} />
      </HydrationBoundary>
    </div>
  )
}
```

- [ ] **Step 4: Crear `src/features/bookings/components/ReservationsPageClient.tsx`**

```typescript
'use client'

import { useUserReservations, useReservationInvites } from '../hooks'
import { ReservationsList } from './ReservationsList'

interface Props {
  userId: string
}

export function ReservationsPageClient({ userId }: Props) {
  const { data: reservations = [] } = useUserReservations(userId)
  const { data: invites = [] } = useReservationInvites(userId)

  return <ReservationsList reservations={reservations} invites={invites} />
}
```

- [ ] **Step 5: Verificar tipos y build**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(bookings|reservations|Reservations)"
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/features/bookings/hooks.ts src/features/bookings/prefetch.ts src/features/bookings/components/ReservationsPageClient.tsx src/app/(dashboard)/dashboard/reservations/page.tsx
git commit -m "feat(bookings): migrate reservations to TanStack Query with optimistic cancel"
```

---

## Task 8: Perfil — hooks, prefetch y migración

**Files:**
- Create: `src/features/users/prefetch.ts`
- Modify: `src/app/(dashboard)/dashboard/profile/page.tsx`

- [ ] **Step 1: Crear `src/features/users/prefetch.ts`**

```typescript
import type { QueryClient } from '@tanstack/react-query'
import { profileKeys } from '@/lib/query/keys'
import { getPlayerStats } from './queries'
import { getUserRoles } from '@/features/memberships/queries'
import { createServiceClient } from '@/lib/supabase/server'

export async function prefetchUserProfile(
  queryClient: QueryClient,
  userId: string
): Promise<void> {
  const supabase = createServiceClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: profileKeys.stats(userId),
      queryFn: () => getPlayerStats(userId),
      staleTime: 300_000,
    }),
    queryClient.prefetchQuery({
      queryKey: profileKeys.roles(userId),
      queryFn: () => getUserRoles(userId),
      staleTime: 300_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['profile', 'data', userId],
      queryFn: async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
        return data
      },
      staleTime: 300_000,
    }),
  ])
}
```

- [ ] **Step 2: Actualizar `src/app/(dashboard)/dashboard/profile/page.tsx`**

Reemplazar contenido completo:

```typescript
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { authorizeOrRedirect } from '@/features/auth/queries'
import { makeQueryClient } from '@/lib/query/client'
import { prefetchUserProfile } from '@/features/users/prefetch'
import { ProfilePageClient } from '@/features/users/components/ProfilePageClient'

export default async function ProfilePage() {
  const ctx = await authorizeOrRedirect()

  const queryClient = makeQueryClient()
  await prefetchUserProfile(queryClient, ctx.userId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfilePageClient userId={ctx.userId} globalRole={ctx.globalRole} />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Crear `src/features/users/components/ProfilePageClient.tsx`**

Mover toda la lógica de UI del `page.tsx` original a este Client Component:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { profileKeys } from '@/lib/query/keys'
import { StatCard } from '@/components/shared/StatCard'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { ProfileEditForm } from './ProfileEditForm'
import { Calendar, Trophy, Target, Star } from 'lucide-react'
import type { Profile, AppRole } from '@/types'

function getInitials(profile: Profile): string {
  const first = profile.first_name?.charAt(0) ?? ''
  const last = profile.last_name?.charAt(0) ?? ''
  if (first || last) return `${first}${last}`.toUpperCase()
  return '?'
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-EC', {
    month: 'long',
    year: 'numeric',
  })
}

interface Props {
  userId: string
  globalRole: string
}

export function ProfilePageClient({ userId, globalRole }: Props) {
  const { data: profile } = useQuery<Profile & { username?: string }>({
    queryKey: ['profile', 'data', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/profile`)
      if (!res.ok) throw new Error('Error cargando perfil')
      const json = await res.json()
      return json.data
    },
  })

  const { data: stats } = useQuery({
    queryKey: profileKeys.stats(userId),
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/stats`)
      if (!res.ok) throw new Error('Error cargando stats')
      const json = await res.json()
      return json.data
    },
  })

  const { data: clubRoles = [] } = useQuery({
    queryKey: profileKeys.roles(userId),
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/roles`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data ?? []
    },
  })

  if (!profile || !stats) return null

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    'Jugador'

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4 py-8 border-b border-border">
        <div className="size-20 rounded-full bg-foreground flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-white">{getInitials(profile)}</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground">{displayName}</h1>
          {profile.username && (
            <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <RoleBadge role={globalRole as AppRole} size="md" />
          {clubRoles.map((entry: { clubId: string; role: string }) => (
            <RoleBadge key={`${entry.clubId}-${entry.role}`} role={entry.role as AppRole} size="md" />
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          {profile.city && <span>{profile.city}</span>}
          {profile.city && <span>·</span>}
          <span>Miembro desde {formatJoinDate(profile.created_at)}</span>
        </div>
      </div>

      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Estadísticas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Reservas Totales" value={stats.totalReservations} icon={Calendar} variant="default" />
          <StatCard label="Torneos" value={stats.tournamentsPlayed} icon={Trophy} variant="accent" />
          <StatCard label="Victorias" value={stats.tournamentsWon} icon={Target} variant="success" />
          <StatCard label="Puntos" value={stats.rankingScore} icon={Star} variant="warning" />
        </div>
      </section>

      <section>
        <ProfileEditForm profile={profile} />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Verificar que existen las API routes necesarias**

```bash
ls src/app/api/users/
```

Si no existen `/api/users/[id]/profile`, `/api/users/[id]/stats`, `/api/users/[id]/roles`, el componente usará los datos del prefetch del servidor (que sí existen). En ese caso, reemplazar los `queryFn` del cliente por funciones que retornen `undefined` y dejar que el prefetch haga el trabajo:

```typescript
// Si no hay API routes, usar solo el dato prefetcheado (staleTime alto = no refetch)
const { data: profile } = useQuery<Profile>({
  queryKey: ['profile', 'data', userId],
  queryFn: () => Promise.resolve(undefined as any), // solo usa el dato del servidor
  staleTime: Infinity,
})
```

> Nota: si no existen las API routes, crear solo las que sean necesarias o usar `staleTime: Infinity` para evitar refetch desde cliente.

- [ ] **Step 5: Verificar tipos**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(profile|Profile)"
```

Expected: sin errores en archivos de perfil.

- [ ] **Step 6: Commit**

```bash
git add src/features/users/prefetch.ts src/features/users/components/ProfilePageClient.tsx src/app/(dashboard)/dashboard/profile/page.tsx
git commit -m "feat(profile): migrate profile page to TanStack Query prefetch"
```

---

## Task 9: Verificación final y build

**Files:** ninguno nuevo

- [ ] **Step 1: Ejecutar todos los tests**

```bash
pnpm vitest run
```

Expected: todos los tests pasan.

- [ ] **Step 2: Build de producción**

```bash
pnpm build
```

Expected: build exitoso sin errores de TypeScript.

- [ ] **Step 3: Verificar en dev que las 3 páginas cargan sin spinner**

```bash
pnpm dev
```

Navegar manualmente a:
1. `/dashboard/tournaments` — datos visibles al instante
2. Volver y volver a entrar — datos instantáneos (caché)
3. `/dashboard/reservations` — datos visibles al instante
4. `/dashboard/profile` — stats visibles al instante

Abrir DevTools → Network → verificar que en la segunda visita NO hay requests a `/api/tournaments`.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(query): complete TanStack Query migration — tournaments, bookings, profile"
```

---

## Notas de implementación

- **Admin pagination** es Fase 2 y requiere cambios en Supabase (índices + cursor queries). No está en este plan.
- Los `queryFn` del cliente llaman a API routes existentes. Si alguna ruta no existe o no devuelve el formato `{ data: T }`, ajustar el fetcher en el hook correspondiente.
- Las DevTools de TanStack Query aparecen en desarrollo (esquina inferior). Útiles para verificar qué está en caché.
- `staleTime: 300_000` (5 min) en perfil y stats porque esos datos cambian poco. `staleTime: 60_000` (1 min) para torneos y reservas.
