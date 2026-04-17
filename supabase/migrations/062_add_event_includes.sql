-- supabase/migrations/062_add_event_includes.sql
alter table events
  add column if not exists event_includes text[] not null default '{}';
