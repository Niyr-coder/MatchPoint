# Player Permissions & Badges — Design Spec
**Date:** 2026-04-14
**Status:** Approved

---

## Overview

Admins and club managers can grant **badges** to players directly from the `UserDetailPanel` sidebar. Each badge automatically grants a defined set of `AppPermission`s — no separate permission toggles. Badges are visible on four surfaces: the admin sidebar, the player's public profile, the player's dashboard, and the ranking/leaderboard.

---

## Decisions

| Question | Decision |
|---|---|
| Scope | Both global (platform-wide) and club-scoped |
| Badge = permission? | Yes — granting a badge grants its permissions automatically |
| Storage approach | New `player_badges` table (not extending `user_roles`) |
| Admin sidebar UI | Inline section (Option A, no modal) |
| Badges at launch | 5: Organizador Verificado, VIP, Árbitro, Embajador, Capitán |

---

## Badges Catalog

| Badge | Key | Emoji | Permisos otorgados | Scope |
|---|---|---|---|---|
| Organizador Verificado | `organizador_verificado` | 🏆 | `tournaments.create`, `tournaments.manage`, `tournaments.view` | Global o club |
| Jugador VIP | `vip` | 👑 | `reservations.create` (prioritaria), `shop.purchase` | Global |
| Árbitro | `arbitro` | ⚖️ | `tournaments.view`, `reservations.checkin` | Club |
| Embajador del Club | `embajador` | ⭐ | `users.view`, `leaderboard.view`, `reports.view_limited` | Club |
| Capitán de Equipo | `capitan` | 🎯 | `team.manage`, `reservations.create` | Club |

---

## Access Control — Who Can Grant

| Badge | Quién puede otorgar |
|---|---|
| VIP | Solo ADMIN global |
| Organizador Verificado | Solo ADMIN global |
| Árbitro | OWNER o MANAGER del club |
| Embajador del Club | OWNER o MANAGER del club |
| Capitán de Equipo | OWNER o MANAGER del club |

---

## Data Model

### Nueva tabla `player_badges`

```sql
CREATE TABLE player_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  club_id    UUID REFERENCES clubs(id) ON DELETE CASCADE, -- NULL = global
  granted_by UUID NOT NULL REFERENCES profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_type, club_id)
);

-- Índices
CREATE INDEX idx_player_badges_user_id ON player_badges(user_id);
CREATE INDEX idx_player_badges_club_id ON player_badges(club_id) WHERE club_id IS NOT NULL;

-- RLS
ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;
-- Lectura: autenticados pueden leer sus propias insignias; admins ven todas
-- Escritura: solo service role (API routes usan service client)
```

### Constante de mapeo badge → permisos (TypeScript)

```typescript
// src/features/badges/constants.ts
import type { AppPermission } from "@/features/auth/types"

export const BADGE_PERMISSION_MAP: Record<string, AppPermission[]> = {
  organizador_verificado: ["tournaments.create", "tournaments.manage", "tournaments.view"],
  vip:                    ["reservations.create", "shop.purchase"],
  arbitro:                ["tournaments.view", "reservations.checkin"],
  embajador:              ["users.view", "leaderboard.view", "reports.view_limited"],
  capitan:                ["team.manage", "reservations.create"],
}

export type BadgeType = keyof typeof BADGE_PERMISSION_MAP
```

---

## Auth Integration

Extender el resolver de `AuthContext` (ya existente) para:

1. Cargar las insignias activas del usuario desde `player_badges` (filtrando por `user_id` y `club_id IS NULL OR club_id = :clubId`).
2. Mapear cada `badge_type` → `AppPermission[]` usando `BADGE_PERMISSION_MAP`.
3. Fusionar esos permisos con los ya derivados del rol del usuario.
4. Agregar campo `badges` al `AuthContext`:

```typescript
// Extensión de AuthContext en src/features/auth/types.ts
export interface PlayerBadge {
  id: string
  badge_type: BadgeType
  club_id: string | null
  granted_at: string
}

export interface AuthContext {
  // ...campos existentes...
  badges: PlayerBadge[]
}
```

No se requieren cambios al middleware de rutas — los permisos ya fluyen por `AuthContext.permissions[]`.

---

## API Layer

### Endpoints admin (solo `global_role = 'admin'`)

```
GET    /api/admin/users/[id]/badges          → listar insignias del usuario
POST   /api/admin/users/[id]/badges          → otorgar insignia
DELETE /api/admin/users/[id]/badges/[badgeId] → revocar insignia
```

**Body POST:**
```typescript
{ badge_type: BadgeType; club_id?: string }
```

Validación server-side: si `badge_type` es `'vip'` o `'organizador_verificado'` y se pasa `club_id`, el server lo acepta (Organizador puede ser club-scoped). `club_id` se ignora para `'vip'` (siempre global).

### Endpoints club (OWNER o MANAGER del club)

```
POST   /api/club/[clubId]/members/[id]/badges
DELETE /api/club/[clubId]/members/[id]/badges/[badgeId]
```

Solo permiten `badge_type` in `['arbitro', 'embajador', 'capitan']`. El server rechaza cualquier otro tipo con 403.

---

## UI — Admin: `BadgesSection`

Nueva sección inline dentro de `UserDetailPanel`, entre `VerificationSection` y `MembershipsSection`.

**Archivo:** `src/components/admin/user-detail/BadgesSection.tsx`

**Estructura del componente:**
```
BadgesSection
├── Encabezado "Insignias" con ícono 🏅
├── Lista de insignias activas
│   └── Por cada badge: emoji + nombre + scope (global / club) + fecha + botón "Revocar"
└── Formulario "Otorgar insignia"
    ├── Select: tipo de insignia
    ├── Select: club (visible solo si badge es club-scoped; oculto para VIP)
    └── Botón "Otorgar"
```

La sección recibe `userId` y `clubs[]` como props (ya disponibles en `UserDetailPanel`). Llama a `GET /api/admin/users/[id]/badges` al montar y tras cada cambio.

---

## UI — Jugador: 3 superficies

### ① Perfil público (`src/features/users/components/ProfileHero.tsx` o equivalente)
- Íconos emoji de insignias junto al nombre del jugador.
- Chips de color debajo del nombre: fondo amarillo para VIP, verde para Organizador, azul para Árbitro, etc.

### ② Dashboard del jugador
- Nueva sección "Mis Insignias" en el dashboard personal.
- Tarjetas con color por badge: descripción de permisos + scope + fecha de otorgamiento.
- **Archivo:** `src/features/badges/components/MyBadgesSection.tsx`

### ③ Ranking / Leaderboard
- Íconos emoji a la derecha del nombre en cada fila de la tabla de ranking.
- Tooltip con el nombre completo de la insignia al hacer hover.
- No requiere cambios al modelo de datos del ranking — se añade a la query existente con join a `player_badges`.

---

## Archivos a crear / modificar

| Acción | Archivo |
|---|---|
| Crear | `supabase/migrations/054_player_badges.sql` |
| Crear | `src/features/badges/constants.ts` |
| Crear | `src/features/badges/types.ts` |
| Crear | `src/components/admin/user-detail/BadgesSection.tsx` |
| Crear | `src/features/badges/components/MyBadgesSection.tsx` |
| Crear | `src/app/api/admin/users/[id]/badges/route.ts` |
| Crear | `src/app/api/admin/users/[id]/badges/[badgeId]/route.ts` |
| Crear | `src/app/api/club/[clubId]/members/[id]/badges/route.ts` |
| Modificar | `src/features/auth/types.ts` — agregar `PlayerBadge`, extender `AuthContext` |
| Modificar | `src/lib/admin/queries/users.ts` — incluir badges en query de usuario |
| Modificar | `src/components/admin/user-detail/UserDetailPanel.tsx` — insertar `BadgesSection` |
| Modificar | Perfil público del jugador — chips e íconos de insignias |
| Modificar | Dashboard del jugador — sección "Mis Insignias" |
| Modificar | Ranking/Leaderboard — íconos emoji junto al nombre |

---

## Fuera de alcance (esta iteración)

- Notificaciones al jugador cuando se le otorga una insignia (siguiente fase).
- Caducidad automática de insignias.
- Insignias personalizadas (nombre/ícono libre) por club.
- Historial de auditoría de insignias (se puede agregar después usando la tabla `audit_log` existente).
