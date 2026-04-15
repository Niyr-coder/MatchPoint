# Organizer Dashboard — Flujo de brackets y canchas

**Fecha:** 2026-04-14  
**Estado:** Aprobado  
**Alcance:** `/dashboard/organizer/[id]` — tab "Bracket / Resultados"

---

## Problema

El panel de gestión de quedadas (`QuedadaManagePanel`) no permite:
1. Crear brackets ni registrar partidos para ninguna dinámica
2. Configurar cuántas canchas estarán activas en una sesión de rotación

---

## Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Canchas en BD vs. UI | Solo estado local React | Sin necesidad de persistencia; valor cambia durante la sesión |
| Lifecycle (estados formales) | Sin estados formales | El organizador empieza a registrar partidos cuando quiera |
| Scoring rotación | Score completo (ej. 11-7) | Ganador se determina automáticamente |
| Bracket dynamics | Reutilizar sistema existente | `tournament_brackets` + endpoints ya funcionales |
| Arquitectura | Enfoque B — panel por dinámica | Responsabilidad única por componente |

---

## Arquitectura de componentes

```
QuedadaManagePanel
└── tab "Bracket / Resultados"
    ├── si game_dynamic ∈ {king_of_court, popcorn}  → <RotationPanel />
    └── si game_dynamic ∈ {standard, round_robin}   → <BracketPanel />
```

### Archivos a crear

| Archivo | Líneas est. |
|---|---|
| `src/features/organizer/components/RotationPanel.tsx` | ~220 |
| `src/features/organizer/components/BracketPanel.tsx` | ~150 |

### Archivo a modificar

| Archivo | Cambio |
|---|---|
| `src/features/organizer/components/QuedadaManagePanel.tsx` | Eliminar lógica del tab "Bracket / Resultados", montar `RotationPanel` o `BracketPanel` según `game_dynamic` |

---

## RotationPanel

**Dinámicas:** `king_of_court`, `popcorn`

### Estado local (React)

```ts
courtCount: 1 | 2 | 3 | 4         // selector UI — no persiste
queue: QuedadaParticipant[]         // orden de espera — init desde participants prop
activeMatches: ActiveMatch[]        // un match por cancha activa
```

```ts
interface ActiveMatch {
  courtIndex: number
  teamA: QuedadaParticipant[]   // 1 jugador (singles) o 2 (dobles/mixtos)
  teamB: QuedadaParticipant[]
  scoreA: number
  scoreB: number
}
```

### Layout

```
[ Canchas activas: 1  2  3  4 ]   ← selector

┌─────────────────────────────┐
│ Cancha 1 — En juego         │
│  Ana / Carlos   [11] vs [ 7]│  ← inputs numéricos
│  Luis / Invitado            │
│  [Registrar resultado →]    │
└─────────────────────────────┘

Fila de espera
  1. María G.        (Siguiente)
  2. Pedro S.
  3. Sofía T.
  4. Invitado Juan   [INVITADO]
```

### Inicialización de equipos

Al montar, los primeros `courtCount * 2` jugadores (o `courtCount * 4` en dobles) se extraen de la cola y se asignan a canchas. El resto queda en fila.

Para dobles/mixtos: los jugadores se emparejan secuencialmente de la cola (posición 1+2 = equipo A, 3+4 = equipo B).

### Flujo al registrar resultado

1. Usuario ingresa score A y score B → se determina ganador (el score mayor gana)
2. Se llama `POST /api/quedadas/[id]/rotation/match` con el resultado
3. Rotación según dinámica:
   - **king_of_court**: ganador permanece en cancha, perdedor(es) al final de la fila. El siguiente en la cola entra.
   - **popcorn**: al registrar resultado aparece un overlay sobre la fila de espera. El organizador toca un jugador de la fila para seleccionarlo como el que entra. Al confirmar, ese jugador ocupa el slot del perdedor en cancha.
4. Estado local se actualiza con nueva formación de cancha + cola

### Persistencia de partidos

Cada partido se guarda en `tournament_brackets` como registro independiente (no pre-generado). Campos usados:

| Campo | Valor |
|---|---|
| `tournament_id` | id de la quedada |
| `player1_id` | primer jugador Equipo A (o representante) |
| `player2_id` | primer jugador Equipo B (o representante) |
| `winner_id` | `player1_id` o `player2_id` |
| `score1` | puntaje Equipo A |
| `score2` | puntaje Equipo B |
| `round` | 0 (convención para partidos de rotación) |
| `match_number` | `SELECT COALESCE(MAX(match_number),0)+1 FROM tournament_brackets WHERE tournament_id=$1 AND round=0` |

> **Nota:** La cola de espera vive solo en React state. Un refresh reinicia el orden. Esto es aceptable para quedadas informales.

> **Invitados (guest players):** `tournament_brackets.player1_id` y `player2_id` requieren `user_id` (no nulo). Si un jugador en cancha es invitado (guest), se omite la llamada al API y el partido no se persiste — solo se actualiza la cola en cliente. El partido cuenta para la rotación pero no queda en el historial.

---

## BracketPanel

**Dinámicas:** `standard`, `round_robin`

### Estados

**Sin bracket generado:**
- Muestra recuento de jugadores inscritos
- Advertencia si son menos de 4
- Botón "Generar bracket" → `POST /api/tournaments/[id]/brackets` (endpoint existente)

**Bracket activo:**
- Lista de partidos agrupados por ronda
- Cada partido: card con nombre jugadores + inputs de score + botón "Guardar resultado"
- Al guardar: llama endpoint de score existente → ganador avanza automáticamente
- Partidos completados: marcados con ✓, score final visible, no editables

### Carga de datos

```ts
// Al montar — verifica si ya existe bracket
GET /api/tournaments/[id]/brackets
// Si data.length > 0 → mostrar bracket
// Si data.length === 0 → mostrar estado "sin bracket"
```

---

## API nueva

### `POST /api/quedadas/[id]/rotation/match`

**Body:**
```ts
{
  player1Id: string        // representante Equipo A
  player2Id: string        // representante Equipo B
  scoreA: number
  scoreB: number
}
```

**Response:**
```ts
{
  success: boolean
  data: {
    matchId: string
    winnerId: string
  }
}
```

**Lógica:**
1. Verificar auth + que el usuario es `created_by` de la quedada
2. Insertar registro en `tournament_brackets` con `round = 0`
3. Retornar el match creado

La rotación de cola se gestiona en el cliente — el API solo persiste el resultado.

---

## Lo que NO cambia

- `QuedadaManagePanel` tabs "Jugadores" e "Invitación" — sin cambios
- Sistema de brackets existente (`tournament_brackets`, endpoints de bracket y score) — sin cambios de backend para `BracketPanel`
- `AddPlayerModal`, `OrganizerShell`, `QuedadaWizard` — sin cambios
- Migración de BD — no se requiere ninguna nueva

---

## Archivos afectados

```
src/features/organizer/components/
  QuedadaManagePanel.tsx         ← modificar (extraer tab Bracket/Resultados)
  RotationPanel.tsx              ← crear
  BracketPanel.tsx               ← crear

src/app/api/quedadas/[id]/
  rotation/
    match/
      route.ts                   ← crear
```
