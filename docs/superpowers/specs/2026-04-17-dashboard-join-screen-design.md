# Dashboard Improvements + Join Screen Design

**Date:** 2026-04-17  
**Status:** Approved

---

## Overview

Two features:
1. **Dashboard mejorado** — reorganización del layout con `PendingInvitesBanner` y `ClubActivityFeed`
2. **Pantalla `/join/[code]`** — nueva ruta pública con hero cover específico por tipo de entidad

---

## 1. Dashboard Mejorado

### Objetivo
Hacer visibles las invitaciones pendientes de todos los tipos (club, torneo, reserva, etc.) y agregar un feed de actividad del club, sin reemplazar los componentes existentes.

### Layout (orden top-to-bottom)

```
WelcomeBanner          ← sin cambios (stats: torneos, reservas, puntos)
PendingInvitesBanner   ← NUEVO — se oculta si no hay pendientes
Grid 2 columnas:
  ReservasPanel        ← modificado: eliminar invite count del footer
  TorneosPanel         ← sin cambios
ClubActivityFeed       ← NUEVO — 3-5 items
Grid 3 columnas:
  PickleballRatingWidget
  MyBadgesSection
  QuickActionsPanel
```

### Componentes nuevos

#### `PendingInvitesBanner`
- Ubicación: `src/components/dashboard/PendingInvitesBanner.tsx`
- Props: `invites: PendingInviteSummary[]` (reservation invites pendientes)
- Render: franja oscura (`bg-slate-900`) con dot ámbar, texto "Tienes X invitaciones a reservas pendientes", lista compacta
- Click → navega a `/dashboard/reservations` donde el usuario puede aceptar/rechazar
- Se oculta completamente si `invites.length === 0`

#### `ClubActivityFeed`
- Ubicación: `src/components/dashboard/ClubActivityFeed.tsx`
- Props: `items: ActivityItem[]` donde `ActivityItem = { type, title, subtitle, timestamp, color }`
- Tipos de actividad: `tournament_opened`, `new_member`, `match_result`, `announcement`
- Renderiza 3-5 items con dot de color según tipo, texto y timestamp relativo
- Query compuesta: torneos abiertos recientes + nuevos miembros del club del usuario

### Modificaciones a componentes existentes

- **`ReservasPanel`** — eliminar el footer con invite count (se reemplaza por el banner)
- **`src/app/(dashboard)/dashboard/page.tsx`** — agregar dos queries nuevas al fetch paralelo:
  - `getPendingInvites(userId)` → retorna invites activos dirigidos al usuario por tipo
  - `getClubActivity(userId)` → retorna actividad reciente del club principal del usuario

### Tipos nuevos

```typescript
interface PendingInviteSummary {
  reservation_id: string
  court_name: string
  date: string
  start_time: string
  host_name: string
}

interface ActivityItem {
  type: 'tournament_opened' | 'new_member' | 'match_result' | 'announcement'
  title: string
  subtitle: string
  timestamp: string
  color: string  // hex color for the dot
}
```

### Queries

**`getPendingInvites(userId)`**
- Fuente: tabla `reservation_invites` — la única tabla que tiene `invited_user_id`
- Los invites de tipo club/torneo/equipo/evento son links genéricos (sin `target_user_id`), así que no se pueden mostrar en el banner automáticamente
- Retorna `reservation_invites` con `invited_user_id = userId AND status = 'pending'`, join con `reservations` para obtener fecha y cancha
- Scope inicial del banner: solo reservas pendientes. Se puede extender cuando se agregue tracking de destinatarios de invites.

**`getClubActivity(userId)`**
- Obtener `club_id` principal del usuario desde `user_roles`
- Torneos: `tournaments` donde `club_id = X AND status = 'open'` ORDER BY `created_at DESC` LIMIT 3
- Nuevos miembros: `club_members` WHERE `club_id = X` ORDER BY `joined_at DESC` LIMIT 3
- Merge, ordenar por timestamp, retornar top 5

---

## 2. Join Screen — `/join/[code]`

### Objetivo
Pantalla pública de landing de invitación con preview rico por tipo de entidad. Cualquiera puede ver el preview; se requiere sesión para hacer join.

### Ruta
`src/app/join/[code]/page.tsx` — **fuera del grupo `(dashboard)`**, sin `authorize()` en el layout.

### Arquitectura de archivos

```
src/app/join/
  [code]/
    page.tsx                  ← Server Component público

src/features/memberships/
  join-preview.ts             ← función server: fetchJoinPreview(code)
  components/
    JoinPageClient.tsx        ← client component: acción de join + auth state
```

### Server Component (`page.tsx`)

```typescript
// Público — no requiere sesión
export default async function JoinPage({ params }) {
  const preview = await fetchJoinPreview(params.code)
  if (!preview) notFound()
  return <JoinPageClient preview={preview} code={params.code} />
}
```

### `fetchJoinPreview(code)`

Dado un `code`, retorna:
```typescript
interface JoinPreview {
  invite: {
    id: string
    entity_type: InviteEntityType
    is_active: boolean
    expires_at: string | null
    uses_count: number
    max_uses: number | null
  }
  entity: JoinEntityData  // datos específicos por tipo (ver abajo)
  status: 'valid' | 'expired' | 'inactive' | 'exhausted'
}
```

No usa `redeem_invite()` RPC — solo consulta para preview, sin efectos secundarios.

### Datos por tipo de entidad

| Tipo | Campos mostrados |
|------|-----------------|
| `club` | nombre, ciudad, fundación, deportes count, canchas count, miembros count, descripción |
| `tournament` | nombre, club, fechas, cupos totales, inscritos, fee, formato, urgencia (días para cierre) |
| `reservation` | cancha, fecha, hora, duración, deporte, nombre del anfitrión (avatar + username) |
| `team` | nombre, deporte, club, miembros count, descripción |
| `event` | nombre, fecha, descripción, organizador |
| `coach_class` | nombre del coach, deporte, nivel, horario, precio |

### `JoinPageClient`

Estado del componente:
- `idle` → muestra CTA según tipo
- `loading` → spinner durante POST a `/api/invites/redeem`
- `success` → mensaje + redirect al dashboard
- `error` → mensaje de error + retry

Si el usuario **no está autenticado**:
- El CTA muestra "Inicia sesión para unirte"
- Click → `router.push('/login?next=/join/' + code)`

Si el invite tiene `status !== 'valid'`:
- No se muestra CTA
- Mensaje explicativo según status: expirada / sin cupos / desactivada / ya eres miembro

### Hero cover — colores por tipo

| Tipo | Gradiente | CTA color |
|------|-----------|-----------|
| `club` | `#1e3a5f → #0f172a` | `#1e3a5f` |
| `tournament` | `#7c3aed → #4338ca` | gradient violeta |
| `reservation` | `#065f46 → #0f172a` | `#065f46` |
| `team` | `#9a3412 → #1c1917` | `#9a3412` |
| `event` | `#c2410c → #1c1917` | `#c2410c` |
| `coach_class` | `#0369a1 → #0f172a` | `#0369a1` |

### Estructura visual (todos los tipos)

```
TopBar: "MATCHPOINT" + "Invitación"
HeroCover (72-100px): gradiente de color + pill del tipo + título + subtítulo
StatsRow: 3-4 métricas clave (varía por tipo)
DescriptionArea: info específica del tipo
[Estado terminal badge si aplica]
CTAButton: acción principal
CTASubtext: contexto (cupos, cierre, auth requerida)
```

### Redirección de `/invite/[code]`

Agregar redirect en `src/app/invite/[code]/page.tsx`:
```typescript
redirect(`/join/${params.code}`)
```

---

## Archivos a crear / modificar

### Crear
- `src/app/join/[code]/page.tsx`
- `src/features/memberships/join-preview.ts`
- `src/features/memberships/components/JoinPageClient.tsx`
- `src/components/dashboard/PendingInvitesBanner.tsx`
- `src/components/dashboard/ClubActivityFeed.tsx`

### Modificar
- `src/app/(dashboard)/dashboard/page.tsx` — agregar 2 queries
- `src/components/dashboard/ReservasPanel.tsx` — eliminar invite count footer
- `src/app/invite/[code]/page.tsx` — agregar redirect a `/join/[code]`

### Sin cambios
- `WelcomeBanner`, `PickleballRatingWidget`, `MyBadgesSection`, `QuickActionsPanel`, `TorneosPanel`
- API routes existentes (`/api/invites`, `/api/invites/redeem`)
- DB schema — no se requieren migraciones

---

## Testing

- Unit: `fetchJoinPreview` — maneja code inválido, invite expirado, invite válido por tipo
- Unit: `getPendingInvites` — agrupa correctamente por entity_type
- Unit: `getClubActivity` — merge y orden correcto
- Component: `PendingInvitesBanner` — se oculta si invites vacíos, muestra badges correctos
- Component: `JoinPageClient` — estados idle/loading/success/error, redirect si no auth
- E2E: flujo completo club invite → join → dashboard
