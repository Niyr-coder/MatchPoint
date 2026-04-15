-- supabase/migrations/057_court_count.sql
-- Add court_count column to tournaments table for quedada court management
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS court_count integer DEFAULT 1;

-- Add comment documenting the column
COMMENT ON COLUMN tournaments.court_count IS 'Number of courts available for this tournament/quedada session';

-- ROLLBACK:
-- ALTER TABLE tournaments DROP COLUMN IF EXISTS court_count;
