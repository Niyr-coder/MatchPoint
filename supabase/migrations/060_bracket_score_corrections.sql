-- Migration 060: bracket_score_corrections table
--
-- Audit log for score corrections on tournament bracket matches.
-- Direct INSERT is intentionally blocked via RLS — all writes go through
-- the correct_bracket_match_score RPC (migration 061) which runs as
-- SECURITY DEFINER.

CREATE TABLE IF NOT EXISTS public.bracket_score_corrections (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       uuid        NOT NULL REFERENCES public.tournament_brackets(id) ON DELETE CASCADE,
  corrected_by   uuid        NOT NULL REFERENCES public.profiles(id),
  old_score      text,
  new_score      text        NOT NULL,
  old_winner_id  uuid        REFERENCES public.profiles(id),
  new_winner_id  uuid        NOT NULL REFERENCES public.profiles(id),
  reason         text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bracket_score_corrections IS
  'Audit log of every score correction applied to a bracket match. '
  'Rows are written exclusively by the correct_bracket_match_score RPC '
  '(SECURITY DEFINER) — no direct INSERT is allowed via RLS.';

CREATE INDEX IF NOT EXISTS bracket_score_corrections_match_id_idx
  ON public.bracket_score_corrections(match_id);

CREATE INDEX IF NOT EXISTS bracket_score_corrections_corrected_by_idx
  ON public.bracket_score_corrections(corrected_by);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.bracket_score_corrections ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users who are a participant or the creator of the
-- tournament that owns the corrected match.
CREATE POLICY "corrections_select_participant_or_creator"
  ON public.bracket_score_corrections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_brackets tb
      JOIN public.tournaments t ON t.id = tb.tournament_id
      WHERE tb.id = bracket_score_corrections.match_id
        AND (
          t.created_by = auth.uid()
          OR tb.player1_id = auth.uid()
          OR tb.player2_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.tournament_brackets tb2
            WHERE tb2.tournament_id = t.id
              AND (tb2.player1_id = auth.uid() OR tb2.player2_id = auth.uid())
          )
        )
    )
  );

-- INSERT: blocked for all roles — writes go through the SECURITY DEFINER RPC.
-- No INSERT policy is defined, so no direct insert is possible.

-- UPDATE / DELETE: blocked (audit records are immutable).
-- No UPDATE or DELETE policies are defined.

-- ---------------------------------------------------------------------------
-- ROLLBACK (commented out — run manually if needed)
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS public.bracket_score_corrections CASCADE;
