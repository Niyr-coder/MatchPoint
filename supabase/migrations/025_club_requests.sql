-- MATCHPOINT — Club creation requests (users → admin review)

CREATE TABLE public.club_requests (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  city          TEXT        NOT NULL,
  province      TEXT        NOT NULL,
  description   TEXT,
  sports        TEXT[]      NOT NULL DEFAULT '{}',
  contact_phone TEXT,
  contact_email TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes   TEXT,
  reviewed_by   UUID        REFERENCES public.profiles(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.club_requests ENABLE ROW LEVEL SECURITY;

-- Users can see only their own requests
CREATE POLICY "club_requests_user_select" ON public.club_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "club_requests_user_insert" ON public.club_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access (for admin operations)
CREATE POLICY "club_requests_service_role" ON public.club_requests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
