-- ============================================================
-- 030_admin_accounts_events_audit.sql
--
-- Adds: audit_log, platform_settings, profile verification
-- columns, extended events columns, and updated RLS for events.
--
-- Order: tables -> alter tables -> constraints -> indexes ->
--        triggers -> RLS -> seed data
--
-- Rollback (run to undo this migration):
--   DROP TABLE IF EXISTS public.platform_settings;
--   DROP TABLE IF EXISTS public.audit_log;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_verified;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_origin;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS verified_at;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS verified_by;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS club_id;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS event_type;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS status;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS max_capacity;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS price;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS is_free;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS visibility;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS registration_deadline;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS min_participants;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS tags;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS updated_at;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS organizer_name;
--   ALTER TABLE public.events DROP COLUMN IF EXISTS organizer_contact;
--   DROP POLICY IF EXISTS "events_select_published_public" ON public.events;
--   DROP POLICY IF EXISTS "events_select_club_only_members" ON public.events;
--   DROP POLICY IF EXISTS "events_select_admin" ON public.events;
--   DROP POLICY IF EXISTS "events_insert_admin" ON public.events;
--   DROP POLICY IF EXISTS "events_insert_club_staff" ON public.events;
--   DROP POLICY IF EXISTS "events_update_admin" ON public.events;
--   DROP POLICY IF EXISTS "events_update_club_staff" ON public.events;
--   DROP POLICY IF EXISTS "events_update_creator" ON public.events;
--   DROP POLICY IF EXISTS "events_delete_admin" ON public.events;
--   DROP POLICY IF EXISTS "events_delete_club_staff" ON public.events;
--   CREATE POLICY "events_select" ON public.events FOR SELECT TO authenticated USING (true);
-- ============================================================

-- ============================================================
-- 1. TABLE: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT          NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  actor_id    UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  details     JSONB         DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log
  IS 'Immutable log of admin and system actions for accountability and debugging.';

-- Indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id
  ON public.audit_log (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

-- RLS: audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read the audit log
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- Inserts go through service_role (API routes with service key)
CREATE POLICY "audit_log_service_role" ON public.audit_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. TABLE: platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         TEXT          PRIMARY KEY,
  value       JSONB         NOT NULL,
  updated_by  UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_settings
  IS 'Key-value store for platform-wide configuration (maintenance mode, version, region, currency).';

-- RLS: platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read settings (needed for maintenance checks, etc.)
CREATE POLICY "platform_settings_select_authenticated" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "platform_settings_update_admin" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- Only admins can insert new settings
CREATE POLICY "platform_settings_insert_admin" ON public.platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- Service role has unrestricted access
CREATE POLICY "platform_settings_service_role" ON public.platform_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. ALTER profiles: verification columns
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified     BOOLEAN      NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_origin  TEXT         NOT NULL DEFAULT 'self_signup';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_at     TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_by     UUID         REFERENCES public.profiles(id) ON DELETE SET NULL;

-- CHECK constraint on account_origin (idempotent via DO block)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_origin_check
    CHECK (account_origin IN ('self_signup', 'admin_created', 'invite'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. ALTER events: extended columns
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS club_id              UUID          REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type           TEXT          NOT NULL DEFAULT 'social';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status               TEXT          NOT NULL DEFAULT 'draft';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS max_capacity         INTEGER;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price                DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_free              BOOLEAN       NOT NULL DEFAULT true;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS visibility           TEXT          NOT NULL DEFAULT 'public';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS min_participants     INTEGER;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tags                 TEXT[]        DEFAULT '{}';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ   DEFAULT now();

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_name       TEXT;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_contact    TEXT;

-- CHECK constraints for events (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN ('social', 'clinic', 'workshop', 'open_day', 'exhibition', 'masterclass', 'quedada', 'other'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_visibility_check
    CHECK (visibility IN ('public', 'club_only', 'invite_only'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_price_non_negative
    CHECK (price >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_max_capacity_positive
    CHECK (max_capacity IS NULL OR max_capacity > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. INDEXES: events (new columns)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_club_id
  ON public.events (club_id);

CREATE INDEX IF NOT EXISTS idx_events_event_type
  ON public.events (event_type);

CREATE INDEX IF NOT EXISTS idx_events_status
  ON public.events (status);

CREATE INDEX IF NOT EXISTS idx_events_start_date_status
  ON public.events (start_date, status);

-- ============================================================
-- 6. TRIGGER: events updated_at
--    Reuses the existing set_updated_at() function from migration 004.
-- ============================================================
DO $$ BEGIN
  CREATE TRIGGER events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 7. RLS: events (replace old broad policies with granular ones)
-- ============================================================

-- Drop old policies that are being replaced
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_service" ON public.events;

-- SELECT: authenticated users can see published + public events
CREATE POLICY "events_select_published_public" ON public.events
  FOR SELECT TO authenticated
  USING (
    status = 'published' AND visibility = 'public'
  );

-- SELECT: club members can see club_only events for their club
CREATE POLICY "events_select_club_only_members" ON public.events
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND visibility = 'club_only'
    AND club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.user_id = auth.uid()
        AND club_members.club_id = events.club_id
        AND club_members.is_active = true
    )
  );

-- SELECT: admins can see all events (including drafts, cancelled, etc.)
CREATE POLICY "events_select_admin" ON public.events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- SELECT: event creator can always see their own events
CREATE POLICY "events_select_creator" ON public.events
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- INSERT: admin can create any event
CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- INSERT: owner/manager can create events for their club
CREATE POLICY "events_insert_club_staff" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.user_id = auth.uid()
        AND club_members.club_id = events.club_id
        AND club_members.is_active = true
        AND club_members.role IN ('owner', 'manager')
    )
  );

-- UPDATE: admin can edit any event
CREATE POLICY "events_update_admin" ON public.events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- UPDATE: owner/manager can edit events for their club
CREATE POLICY "events_update_club_staff" ON public.events
  FOR UPDATE TO authenticated
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.user_id = auth.uid()
        AND club_members.club_id = events.club_id
        AND club_members.is_active = true
        AND club_members.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.user_id = auth.uid()
        AND club_members.club_id = events.club_id
        AND club_members.is_active = true
        AND club_members.role IN ('owner', 'manager')
    )
  );

-- UPDATE: creator can edit their own events
CREATE POLICY "events_update_creator" ON public.events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: admin can delete any event
CREATE POLICY "events_delete_admin" ON public.events
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role = 'admin'
    )
  );

-- DELETE: owner/manager can delete events for their club
CREATE POLICY "events_delete_club_staff" ON public.events
  FOR DELETE TO authenticated
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.user_id = auth.uid()
        AND club_members.club_id = events.club_id
        AND club_members.is_active = true
        AND club_members.role IN ('owner', 'manager')
    )
  );

-- Service role retains unrestricted access
CREATE POLICY "events_service_role" ON public.events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 8. SEED: platform_settings initial values
-- ============================================================
INSERT INTO public.platform_settings (key, value)
VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('platform_version', '"1.0.0 Beta"'::jsonb),
  ('platform_region',  '"Ecuador"'::jsonb),
  ('platform_currency', '"USD"'::jsonb)
ON CONFLICT (key) DO NOTHING;
