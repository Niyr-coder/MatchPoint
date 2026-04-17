# Admin Tables — Inline Expand Redesign

**Date:** 2026-04-17
**Scope:** Rediseño visual de las 6 páginas de tablas del área admin con patrón inline expand.

---

## Problema

Las páginas de tablas admin (Usuarios, Clubes, Eventos, Torneos, Invitaciones, Reservaciones) se ven genéricas y no dejan claro qué se puede hacer con cada fila:

- Las filas no dan señales visuales de ser clickeables (sin hover state, sin cursor-pointer).
- Las acciones son difíciles de encontrar o están enterradas en paneles laterales no obvios.
- El toolbar varía entre páginas (algunos usan `<select>` nativos, otros `FilterBar`, sin coherencia).
- `AdminUsersView` abre un slide-over (`UserDetailPanel`) al hacer click en la fila, pero no hay affordance visual que lo indique.

---

## Qué cambia

### Patrón unificado: Inline Expand

Todas las páginas de tablas adoptan el mismo patrón:

1. **Columna ▶** — primera columna de cada fila. Click en la fila (o en el ▶) alterna el estado expand/collapse. El ▶ rota 90° cuando está abierto.
2. **Fila expandida** — la fila siguiente muestra un panel inline con:
   - Avatar/initials grande (44×44px, rounded-xl)
   - Nombre + datos secundarios (email, ciudad, etc.)
   - Chips de contexto (membresías, deportes, capacidad, etc.)
   - Botones de acción contextuales (Editar, Suspender/Reactivar, Ver detalle, Eliminar)
3. **Botón ⋯** — última columna, siempre visible. Abre un dropdown con 2-4 acciones rápidas sin necesidad de expandir. Las acciones del ⋯ son un subconjunto de las del panel expandido.
4. **Hover state** — `hover:bg-zinc-50 cursor-pointer` en todas las filas normales. La fila expandida usa `bg-[#f8faff]`, el panel inline `bg-[#f0f6ff]`.

### Toolbar estandarizado

Reemplazar el toolbar actual de cada página con:
```
[ 🔍 Buscar…  ] [ Filtro A ▾ ] [ Filtro B ▾ ] (chips pill)    [ + Crear ]
```
- Input de búsqueda: `bg-zinc-50 border border-zinc-200 rounded-lg`
- Chips de filtro: `border border-zinc-200 rounded-full px-3 py-1 text-[10px] font-bold`. Activo: `bg-zinc-900 text-white border-zinc-900`.
- Botón Crear: `bg-foreground text-white rounded-full px-4 py-2 text-sm font-bold` (ya existe, se mantiene).

### Colores del panel expandido

| Color | Uso |
|-------|-----|
| `bg-[#f8faff]` | Fondo de la fila en estado expandido |
| `bg-[#f0f6ff]` | Fondo del panel de detalle inline |
| `border-[#e5e7eb]` | Borde inferior del panel |
| `bg-zinc-50 border-zinc-200` | Chips de contexto |

### Acciones por entidad

| Entidad | Acciones en panel expandido |
|---------|----------------------------|
| Usuario | Editar · Suspender/Reactivar · Ver membresía · Eliminar |
| Club | Editar · Desactivar · Ver miembros · Eliminar |
| Evento | Editar · Cancelar evento · Ver inscritos · Eliminar |
| Torneo | Editar · Cancelar torneo · Ver bracket · Eliminar |
| Invitación | Copiar enlace · Desactivar · Eliminar |
| Reservación | Ver detalle · Cancelar · Contactar usuario |

---

## Componentes nuevos

### `src/components/admin/shared/AdminDotsMenu.tsx`
Dropdown ⋯ reutilizable. Props:
```typescript
interface AdminDotsMenuProps {
  items: Array<{
    label: string
    onClick: () => void
    variant?: "default" | "danger"
    disabled?: boolean
  }>
}
```
- Botón: 26×26px, `rounded-lg bg-zinc-50 border border-zinc-200`, texto `⋯`
- Dropdown: `absolute right-0 z-10 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 min-w-[140px]`
- Item default: `text-zinc-700 hover:bg-zinc-50`
- Item danger: `text-red-600 hover:bg-red-50`
- Cierra al hacer click fuera (useClickOutside)

### `src/components/admin/shared/AdminInlinePanel.tsx`
Shell del panel expandido. Props:
```typescript
interface AdminInlinePanelProps {
  avatar: React.ReactNode       // el avatar/initials grande
  name: string
  subtitle: string
  chips?: string[]
  actions: React.ReactNode      // botones de acción
  badge?: React.ReactNode       // badge opcional (verificado, suspendido, etc.)
}
```

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/features/activities/components/AdminEventsView.tsx` | Agregar inline expand, estandarizar toolbar |
| `src/components/admin/AdminUsersView.tsx` | Reemplazar slide-over por inline expand; mantener `CreateUserModal` y `ConfirmDialog` |
| `src/components/admin/AdminClubsView.tsx` | Agregar inline expand; mantener `ClubModal` para crear/editar |
| `src/components/admin/AdminTournamentsView.tsx` | Agregar inline expand, estandarizar toolbar |
| `src/components/admin/AdminInvitesView.tsx` | Agregar inline expand, estandarizar toolbar |
| `src/components/admin/AdminReservationsView.tsx` | Agregar inline expand, estandarizar toolbar |
| `src/components/admin/user-detail/UserDetailPanel.tsx` | **Eliminar** — reemplazado por inline expand en AdminUsersView |

### Archivos nuevos

| Archivo | Contenido |
|---------|-----------|
| `src/components/admin/shared/AdminDotsMenu.tsx` | Dropdown ⋯ reutilizable |
| `src/components/admin/shared/AdminInlinePanel.tsx` | Shell del panel de detalle inline |

---

## Lo que NO cambia

- `CreateUserModal` — se mantiene para crear usuarios.
- `ClubModal` — se mantiene para crear/editar clubes.
- `EventFormModal` — se mantiene para crear/editar eventos.
- `ConfirmDialog` — se mantiene para confirmaciones destructivas.
- `DataTable` — se mantiene como base; las views lo extienden con la columna ▶ y el estado expandido.
- Lógica de negocio (API calls, filtros, bulk selection) — sin cambios.
- Páginas fuera de scope: Settings, Shop, Audit, Moderation, Financials, Chat, Analytics.

---

## Criterios de éxito

- Las 6 páginas usan el mismo patrón visual de toolbar + tabla + inline expand.
- Cada fila tiene hover state visible (`hover:bg-zinc-50 cursor-pointer`).
- El ▶ rota al expandir; la fila expandida tiene fondo azul tenue.
- El panel inline muestra avatar, datos relevantes, chips y acciones para cada entidad.
- El ⋯ abre un dropdown con acciones rápidas sin necesidad de expandir.
- `UserDetailPanel` (slide-over) está eliminado de `AdminUsersView`.
- Build pasa, sin errores TypeScript.
- No hay regresión en `CreateUserModal`, `ClubModal`, ni `ConfirmDialog`.
