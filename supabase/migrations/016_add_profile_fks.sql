-- Migration 016: Add direct FKs from user_id columns to profiles(id)
--
-- Problem: All user_id columns reference auth.users(id), but PostgREST
-- cannot resolve joins to the public.profiles table through the auth schema.
-- Adding explicit FKs to profiles allows PostgREST to resolve these joins.
--
-- These FKs are ADDITIONAL to the existing auth.users FKs (which handle CASCADE).
-- Since profiles.id = auth.users.id, these constraints are always satisfiable.

-- tournament_participants.user_id → profiles(id)
ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tp_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- rankings.user_id → profiles(id)
ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- club_members.user_id → profiles(id)
ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- reservations.user_id → profiles(id)
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
