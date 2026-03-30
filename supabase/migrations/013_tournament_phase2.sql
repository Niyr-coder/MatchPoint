-- Migration 013: Tournament Phase 2 — full lifecycle management

-- 1. Add 'withdrawn' to participant_status enum
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'withdrawn';

-- 2. Add withdrawal_reason column
ALTER TABLE tournament_participants
  ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- 3. Expand payment_status to include 'refunded'
--    Drop the auto-named check constraint and recreate with all four values
ALTER TABLE tournament_participants
  DROP CONSTRAINT IF EXISTS tournament_participants_payment_status_check;

ALTER TABLE tournament_participants
  ADD CONSTRAINT tournament_participants_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'waived', 'refunded'));

-- 4. Add bracket_locked flag (set true when first match result is recorded)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS bracket_locked BOOLEAN NOT NULL DEFAULT false;
