-- ============================================================
-- 037_rollback_invite_use.sql
-- Compensating RPC for failed join handlers in /api/invites/redeem.
--
-- Race condition: redeem_invite increments uses_count in its own
-- transaction. If the TypeScript join handler then throws, the slot
-- is consumed without the user actually joining.
--
-- This function is called in the catch block of the redeem route to
-- undo that increment so the invite slot is not permanently lost.
--
-- Rollback (run to undo this migration):
--   DROP FUNCTION IF EXISTS public.rollback_invite_use(UUID);
-- ============================================================

CREATE OR REPLACE FUNCTION public.rollback_invite_use(p_invite_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invite_links
     SET uses_count = GREATEST(uses_count - 1, 0),
         -- Re-activate the link if it was auto-deactivated when it hit max_uses.
         -- We detect this by: max_uses IS NOT NULL AND current uses_count >= max_uses,
         -- meaning the last successful redeem triggered the CASE…false branch in
         -- redeem_invite. Decrementing frees a slot, so we restore is_active.
         is_active  = CASE
                        WHEN max_uses IS NOT NULL AND uses_count >= max_uses
                        THEN true
                        ELSE is_active
                      END
   WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RAISE WARNING 'rollback_invite_use: invite_id=% not found — no row updated', p_invite_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rollback_invite_use(UUID)
  IS 'Compensating action for a failed join handler: decrements uses_count and re-activates the invite link if it was auto-deactivated at exhaustion.';

-- Only the service role (used by API routes) should call this function.
GRANT EXECUTE ON FUNCTION public.rollback_invite_use(UUID) TO service_role;
