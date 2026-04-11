-- Migration: add 'ranking' as a valid event_type value
-- Drops the old CHECK constraint and recreates it with 'ranking' included.

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'social', 'clinic', 'workshop', 'open_day',
    'exhibition', 'masterclass', 'quedada', 'ranking', 'other'
  ));
