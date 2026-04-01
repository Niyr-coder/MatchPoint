-- Migration 022: Fix reservation_invites INSERT policy
--
-- The original "invites_insert_own" policy (migration 004) had WITH CHECK (true),
-- allowing any authenticated user to send invitations on behalf of any reservation
-- they don't own — a privilege escalation vector.
--
-- Fix: restrict INSERT to users who own the target reservation.
-- Also adds a SELECT policy for reservation owners so they can see
-- who they have invited (the original policy only showed the invited side).

DROP POLICY IF EXISTS "invites_insert_own"        ON public.reservation_invites;
DROP POLICY IF EXISTS "invites_select_reservee"   ON public.reservation_invites;

-- INSERT: only the reservation owner can invite others
CREATE POLICY "invites_insert_own"
  ON public.reservation_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reservation_id IN (
      SELECT id
      FROM public.reservations
      WHERE user_id = auth.uid()
    )
  );

-- SELECT (new): reservation owners can see the invitations they sent
CREATE POLICY "invites_select_reservee"
  ON public.reservation_invites
  FOR SELECT
  TO authenticated
  USING (
    reservation_id IN (
      SELECT id
      FROM public.reservations
      WHERE user_id = auth.uid()
    )
  );
