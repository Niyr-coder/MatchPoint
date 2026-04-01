-- Migration 020: REVOKE/GRANT for atomic RPCs (018, 019)
--
-- Wrapped in a DO block because the Supabase CLI requires exactly one
-- top-level statement per migration file.

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.create_order_atomic(UUID, JSONB) FROM PUBLIC;
  GRANT  EXECUTE ON FUNCTION public.create_order_atomic(UUID, JSONB) TO authenticated;

  REVOKE EXECUTE ON FUNCTION public.score_bracket_match(UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN) FROM PUBLIC;
  GRANT  EXECUTE ON FUNCTION public.score_bracket_match(UUID, UUID, UUID, UUID, INT, INT, TEXT, BOOLEAN) TO authenticated;
END;
$$
