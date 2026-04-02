-- Migration 028: Missing FK indexes, RLS gap, and data-integrity constraints
-- Identified during audit 2026-04-02.

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Missing indexes on foreign-key columns
-- Without these, lookups that filter by these columns do full table scans.
-- ─────────────────────────────────────────────────────────────────────────────

-- notifications
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id);

-- teams
CREATE INDEX IF NOT EXISTS teams_created_by_idx
  ON public.teams (created_by);

CREATE INDEX IF NOT EXISTS teams_club_id_idx
  ON public.teams (club_id);

-- team_members — UNIQUE(team_id, user_id) covers team_id lookups;
-- need a separate index for reverse lookup by user_id.
CREATE INDEX IF NOT EXISTS team_members_user_idx
  ON public.team_members (user_id);

-- club_requests
CREATE INDEX IF NOT EXISTS club_requests_user_idx
  ON public.club_requests (user_id);

CREATE INDEX IF NOT EXISTS club_requests_reviewed_by_idx
  ON public.club_requests (reviewed_by);

-- order_items — ON DELETE CASCADE exists but no index on the FK columns
CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS order_items_product_idx
  ON public.order_items (product_id);

-- tournament_brackets — extend existing (tournament_id, round) with match_number
-- for queries that filter all three columns simultaneously.
CREATE INDEX IF NOT EXISTS brackets_match_idx
  ON public.tournament_brackets (tournament_id, round, match_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: RLS gap — users cannot delete their own notifications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "notifications_user_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Data integrity — enforce allowed notification types via CHECK
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('club_request_approved', 'club_request_rejected', 'team_invite', 'system'));
