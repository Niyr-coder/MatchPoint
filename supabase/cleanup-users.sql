-- ============================================================
-- WARNING: DESTRUCTIVE — IRREVERSIBLE OPERATION
-- Elimina TODOS los usuarios y sus datos asociados.
-- Ejecutar SOLO intencionalmente para forzar re-registro.
--
-- Uso: supabase db query --linked -f supabase/cleanup-users.sql
-- ============================================================

BEGIN;

-- 1. Invitaciones a reservas (referencia reservas + auth.users)
DELETE FROM public.reservation_invites;

-- 2. Reservas (referencia auth.users y courts con ON DELETE RESTRICT)
DELETE FROM public.reservations;

-- 3. Participantes de torneos (referencia auth.users + torneos)
DELETE FROM public.tournament_participants;

-- 4. Torneos (created_by tiene ON DELETE RESTRICT — debe ir antes de borrar users)
DELETE FROM public.tournaments;

-- 5. Eventos (created_by tiene ON DELETE SET NULL — limpieza explícita)
DELETE FROM public.events;

-- 6. Miembros de clubes
DELETE FROM public.club_members;

-- 7. Clubes (created_by referencia auth.users)
DELETE FROM public.clubs;

-- 8. Perfiles de usuario
DELETE FROM public.profiles;

-- 9. Sesiones activas de Supabase Auth
DELETE FROM auth.sessions;

-- 10. Refresh tokens
DELETE FROM auth.refresh_tokens;

-- 11. Usuarios de Supabase Auth (cascade a mfa_factors, identities, etc.)
DELETE FROM auth.users;

COMMIT;
