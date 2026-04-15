-- Migration 055: Organizer quedadas support

-- 1. Event type flag on tournaments (default 'tournament' preserves all existing rows)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'tournament'
    CHECK (event_type IN ('tournament', 'quedada'));

-- 2. Game dynamic for quedadas
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS game_dynamic TEXT
    CHECK (game_dynamic IN ('standard', 'king_of_court', 'popcorn', 'round_robin'));

-- 3. Guest player columns on participants
ALTER TABLE tournament_participants
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_lastname TEXT;

-- 4. Identity constraint: either a registered user or a guest name must be present
ALTER TABLE tournament_participants
  ADD CONSTRAINT IF NOT EXISTS participant_identity_check
    CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);
