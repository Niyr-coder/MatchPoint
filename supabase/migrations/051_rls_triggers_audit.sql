-- Migration 051: RLS hardening for rate_limit_requests + updated_at triggers
--
-- 1. rate_limit_requests was created with DISABLE ROW LEVEL SECURITY (migration 027)
--    and a comment "No RLS needed — only accessed via service role from rate-limit.ts".
--    However, PostgREST exposes all public tables to authenticated/anon roles unless
--    RLS is enabled. With DISABLE RLS, authenticated users can SELECT all rows directly
--    via the REST API, leaking IP identifiers and request patterns of all users.
--    Fix: ENABLE RLS with no permissive policies → default deny for all roles.
--    The check_rate_limit() RPC (SECURITY DEFINER) bypasses RLS and continues to work.
--
-- 2. Several tables added after migration 032 are missing updated_at triggers:
--    - conversations (added in migration 007)
--    - events        (added in migration 030, trigger added inline but guard needed)
--    - invite_links  (added in migration 029)
--    - tournament_feedback (added in migration 047)
--
-- The set_updated_at() trigger function is defined in migration 004 and reused here.
-- ============================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- 1. rate_limit_requests — ENABLE RLS (deny all direct access by non-service roles)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Explicit service_role bypass (matches pattern used across all other tables)
DROP POLICY IF EXISTS "rate_limit_service_role" ON public.rate_limit_requests;

CREATE POLICY "rate_limit_service_role"
  ON public.rate_limit_requests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- No policies for authenticated/anon → default deny.
-- check_rate_limit() SECURITY DEFINER function is unaffected by RLS.


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. updated_at triggers for tables missing coverage
-- ──────────────────────────────────────────────────────────────────────────────

-- conversations (migration 007 added table, no updated_at trigger)
DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- invite_links (migration 029 added table)
-- Guard against the trigger already existing from a manual patch
DROP TRIGGER IF EXISTS invite_links_updated_at ON public.invite_links;

CREATE TRIGGER invite_links_updated_at
  BEFORE UPDATE ON public.invite_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- tournament_feedback (migration 047 added table)
DROP TRIGGER IF EXISTS tournament_feedback_updated_at ON public.tournament_feedback;

CREATE TRIGGER tournament_feedback_updated_at
  BEFORE UPDATE ON public.tournament_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- events trigger is added inline in migration 030 (inside a DO block).
-- Re-create idempotently to ensure it exists even on fresh resets.
DROP TRIGGER IF EXISTS events_updated_at ON public.events;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
