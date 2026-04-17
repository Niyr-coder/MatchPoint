# Data Fetching Performance — MATCHPOINT

**Fecha:** 2026-04-17  
**Enfoque elegido:** TanStack Query v5 + Prefetch desde Servidor  
**Objetivo:** Cero spinners en navegación, escala a miles de usuarios, UX de app nativa

---

## Contexto

El proyecto usa Server Components con fetch directo y `Promise.all()` — arquitectura correcta pero sin optimización de caché. Cada navegación dispara queries nuevas a Supabase. Las vistas admin cargan todos los registros sin paginación. No hay prefetching ni optimistic UI.

---

## Arquitectura

### Capas de caché (rápido → lento)

1. **TanStack memory cache** — datos en RAM del browser, respuesta instantánea al navegar entre páginas ya visitadas
2. **unstable_cache servidor** — resultado de queries cacheado en el servidor con TTL configurable, evita hits a Supabase en requests repetidos
3. **Supabase DB** — fuente de verdad, solo se consulta cuando las capas anteriores expiran

### Flujo de datos

```
Supabase DB → Server Component (prefetchQuery + unstable_cache) → HydrationBoundary → Client Component (useQuery instantáneo)
```

El Server Component ejecuta las queries en el servidor durante el SSR, las serializa en el HTML inicial vía `HydrationBoundary`. El cliente rehidrata sin requests adicionales. TanStack refresca en background después del `staleTime` sin interrumpir la UI.

---

## Componentes nuevos

### `src/lib/query/client.ts`

Singleton de `QueryClient` con configuración global:

- `staleTime: 60_000` — datos frescos por 1 minuto (sin refetch en navegación rápida)
- `gcTime: 300_000` — datos en memoria por 5 minutos
- Función `makeQueryClient()` que crea un cliente por request en servidor, y reutiliza el mismo en cliente

### `src/lib/query/provider.tsx`

`QueryClientProvider` envolviendo el layout raíz. Incluye `ReactQueryDevtools` solo en desarrollo. Acepta el estado deshidratado del servidor vía `HydrationBoundary` en cada página.

### `src/lib/query/keys.ts`

Query key factory centralizada. Una función por dominio, con keys jerárquicas que permiten invalidación quirúrgica:

```ts
tournamentKeys.all()        // ['tournaments']
tournamentKeys.open()       // ['tournaments', 'open']
tournamentKeys.detail(id)   // ['tournaments', id]

reservationKeys.all()       // ['reservations']
reservationKeys.user(uid)   // ['reservations', 'user', uid]

profileKeys.stats(uid)      // ['profile', 'stats', uid]
adminKeys.users()           // ['admin', 'users']
adminKeys.tournaments()     // ['admin', 'tournaments']
```

### Hooks por feature (`src/features/*/hooks.ts`)

Cada feature expone hooks de `useQuery` y `useMutation`:

```ts
// src/features/tournaments/hooks.ts
export function useOpenTournaments() { ... }
export function useJoinTournament() { ... }  // con optimistic update

// src/features/reservations/hooks.ts
export function useUserReservations() { ... }
export function useCancelReservation() { ... }  // con optimistic update
```

### Prefetch helpers (`src/features/*/prefetch.ts`)

Funciones que reciben un `QueryClient` del servidor y prefetchean las queries del feature. Se llaman desde `page.tsx` antes de renderizar.

---

## Patrón de implementación por página

### Server Component (`page.tsx`)

```ts
export default async function Page() {
  const qc = makeQueryClient()
  await Promise.all([
    qc.prefetchQuery({ queryKey: tournamentKeys.open(), queryFn: getOpenTournaments }),
  ])
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <TournamentsClient />
    </HydrationBoundary>
  )
}
```

### Client Component

```ts
"use client"
export function TournamentsClient() {
  const { data } = useQuery({
    queryKey: tournamentKeys.open(),
    queryFn: () => fetch('/api/tournaments/open').then(r => r.json()),
    // Llama a API route — no puede usar queries.ts directamente (servidor)
    // En el primer render usa los datos del servidor (prefetch), no hace fetch
  })
  // data disponible desde el render inicial — sin spinner
}
```

---

## Paginación en vistas Admin

Las vistas admin actuales cargan todos los registros. Se reemplaza con cursor-based pagination:

- Parámetro `cursor` (último ID visto) + `limit: 50`
- Índice en columna de sort (`created_at`, `id`) en Supabase
- TanStack Query `useInfiniteQuery` para infinite scroll o paginador clásico con botones Anterior/Siguiente
- Filtros del lado servidor (query params → API route) para no cargar datos innecesarios

Vistas prioritarias: `/admin/users`, `/admin/tournaments`, `/admin/reservations`

---

## Invalidación de caché

Al mutar datos, se invalida quirúrgicamente:

```ts
// Al unirse a torneo → invalidar solo torneos abiertos
queryClient.invalidateQueries({ queryKey: tournamentKeys.open() })

// Al cancelar reserva → invalidar reservas del usuario
queryClient.invalidateQueries({ queryKey: reservationKeys.user(userId) })

// Optimistic update: la UI cambia antes de la respuesta del servidor
// Si el servidor falla, TanStack hace rollback automático
```

---

## Orden de implementación (migración gradual)

La migración es no-destructiva: el código existente funciona mientras se añaden las capas nuevas.

**Fase 1 — Infraestructura base** (sin tocar features)
1. Instalar `@tanstack/react-query` + devtools
2. Crear `src/lib/query/` (client, provider, keys)
3. Wrappear `layout.tsx` raíz con `QueryClientProvider`

**Fase 2 — Feature por feature (empezar por torneos)**
4. Crear `hooks.ts` + `prefetch.ts` en `features/tournaments/`
5. Migrar `page.tsx` a patrón prefetch + HydrationBoundary
6. Agregar optimistic update a "unirse a torneo"

**Fase 3 — Reservas**
7. Mismo patrón en `features/reservations/`
8. Optimistic update en cancelar reserva

**Fase 4 — Admin con paginación**
9. Refactorizar queries admin a cursor pagination
10. Agregar índices en Supabase
11. `useInfiniteQuery` en vistas admin

**Fase 5 — Perfil y resto**
12. Stats del perfil con `staleTime: 300_000` (5 min)
13. Cualquier otra vista que quede

---

## Archivos a crear/modificar

### Nuevos
- `src/lib/query/client.ts`
- `src/lib/query/provider.tsx`
- `src/lib/query/keys.ts`
- `src/features/tournaments/hooks.ts`
- `src/features/tournaments/prefetch.ts`
- `src/features/reservations/hooks.ts`
- `src/features/reservations/prefetch.ts`
- `src/features/profile/hooks.ts`
- `src/features/profile/prefetch.ts`

### Modificados
- `src/app/layout.tsx` — agregar QueryClientProvider
- `src/app/(dashboard)/dashboard/tournaments/page.tsx` — patrón prefetch
- `src/app/(dashboard)/dashboard/reservations/page.tsx` — patrón prefetch
- `src/app/(dashboard)/dashboard/profile/page.tsx` — patrón prefetch
- `src/app/(dashboard)/admin/*/page.tsx` — cursor pagination

### Sin cambios
- `src/features/*/queries.ts` — las queries del servidor se reutilizan como `queryFn`
- RLS policies, API routes, Server Actions — sin modificaciones

---

## Dependencias

```json
{
  "@tanstack/react-query": "^5.0.0",
  "@tanstack/react-query-devtools": "^5.0.0"
}
```

Sin otras dependencias nuevas. Compatible con Next.js 16 App Router.

---

## Criterios de éxito

- Primera visita: datos aparecen sin spinner (SSR con prefetch)
- Navegación de vuelta a página ya visitada: datos instantáneos (memory cache)
- Mutaciones (join torneo, cancelar reserva): UI actualiza antes de respuesta del servidor (optimistic)
- Admin con 10.000+ registros: pagina sin degradación de performance
- DevTools de TanStack muestran hit de caché en navegación repetida
