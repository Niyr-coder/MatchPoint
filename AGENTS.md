<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MATCHPOINT — Agent Guide

Multi-sport platform for Ecuadorian sports clubs (Fútbol, Pádel, Tenis, Pickleball).

**Stack**: Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · shadcn/ui (`@base-ui/react`) · Supabase (PostgreSQL + RLS + Realtime) · Zod · Vercel

> **CRITICAL — shadcn/ui**: Uses `@base-ui/react`. There is NO `asChild` prop. Use `buttonVariants()` with `className` on `<a>` tags instead of `<Button asChild>`.

---

## Agent Roster

All agents live in `~/.claude/agents/`. Use them by name via the `Agent` tool.

### Orchestration

| Agent | Model | When to invoke |
|-------|-------|----------------|
| `matchpoint-orchestrator` | Opus | Tasks that cross 2+ domains simultaneously |

### Backend

| Agent | Model | When to invoke |
|-------|-------|----------------|
| `backend-architect` | Sonnet | API routes (`src/app/api/`), sync logic, event-driven patterns |
| `database-designer` | Sonnet | Schema changes, migrations, triggers, RLS policies |
| `auth-permissions` | Sonnet | 7-role system, middleware, onboarding flow, RLS for auth |
| `background-jobs` | Sonnet | pg-boss jobs, cron tasks, async processing |
| `realtime-infrastructure` | Sonnet | Supabase Realtime, WebSockets, chat subscriptions |

### Domain Logic

| Agent | Model | When to invoke |
|-------|-------|----------------|
| `club-management` | Sonnet | Clubs, courts, schedules, reservations, memberships |
| `tournament-ranking-engine` | Sonnet | Brackets, scores, rankings, sport-specific rules |
| `payments-finances` | Sonnet | Stripe, billing, financial reports |
| `social-features` | Sonnet | Chat, player profiles, match history |

### Frontend

| Agent | Model | When to invoke |
|-------|-------|----------------|
| `frontend-integration` | Sonnet | Dashboard pages, UI components, Server/Client Components |

### Infrastructure & Quality

| Agent | Model | When to invoke |
|-------|-------|----------------|
| `devops-deployment` | Sonnet | Vercel deploy, CI/CD, env vars, migration pipeline |
| `notifications-email` | Haiku | Email templates (Resend), in-app notifications, push |
| `analytics-dashboards` | Haiku | KPI dashboards, charts, aggregated metrics |
| `testing-qa` | Haiku | Vitest unit/integration tests, Playwright E2E |

---

## Routing by Task

### "Implement a new feature"
```
1. database-designer     → schema + migrations (if new tables needed)
2. auth-permissions      → RLS policies for the feature
3. backend-architect     → API route or Server Action
4. frontend-integration  → UI components + pages
5. testing-qa            → tests for the feature
```

### "Something's broken in production"
```
1. Identify domain (API? DB? UI? Realtime?)
2. Relevant domain agent → diagnose + fix
3. testing-qa            → regression test
4. devops-deployment     → verify deploy
```

### "Add real-time updates"
```
1. realtime-infrastructure → Supabase channel + hooks
2. frontend-integration    → consume the hook in UI
```

### "Add a background task"
```
1. background-jobs       → pg-boss job + handler
2. backend-architect     → trigger endpoint if needed
3. notifications-email   → notify on completion (if needed)
```

### "Cross-domain feature (e.g., full tournament flow)"
```
→ matchpoint-orchestrator  (coordinates all agents)
```

---

## Domain Boundaries

Each agent owns its layer. Do not cross boundaries without coordination:

| Layer | Owner | Off-limits for |
|-------|-------|----------------|
| `supabase/migrations/` | `database-designer` | All others |
| `src/app/api/` | `backend-architect` | `frontend-integration` |
| `src/components/`, `src/app/(dashboard)/` | `frontend-integration` | `backend-architect` |
| Auth middleware, role checks | `auth-permissions` | All others |
| pg-boss job handlers | `background-jobs` | `backend-architect` |
| Realtime channels/hooks | `realtime-infrastructure` | `frontend-integration` (consumes, doesn't define) |

---

## Project Conventions

### Authorization (mandatory in every protected operation)
Every protected route/action must verify in order:
1. Authenticated (Supabase session)
2. User exists in DB (`profiles`)
3. Is ADMIN? (global access)
4. Has access to this club? (`user_roles`)
5. Has the required role? (role hierarchy)
6. Has the specific permission? (fine-grained)

### API Response Shape
```typescript
{ data: T | null, error: string | null, meta?: { total, page, limit } }
```

### Role Hierarchy
```
ADMIN (7) > OWNER (6) > MANAGER (5) > PARTNER (4) > COACH (3) > EMPLOYEE (2) > USER (1)
```
Users can hold multiple roles across different clubs (club-scoped).

### Immutability
Always return new objects. Never mutate in place.

### File Size
200–400 lines typical. 800 max. Extract when exceeding.
