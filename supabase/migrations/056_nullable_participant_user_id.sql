-- Migration 056: Allow null user_id on tournament_participants for guest players
--
-- Migration 055 added guest support with a CHECK constraint
-- (user_id IS NOT NULL OR guest_name IS NOT NULL), but never dropped
-- the original NOT NULL constraint on user_id. Guest inserts therefore
-- fail with "null value in column user_id violates not-null constraint".

ALTER TABLE tournament_participants
  ALTER COLUMN user_id DROP NOT NULL;
