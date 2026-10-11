-- PocketCoach Migration: Remove Anonymous Insert Fallback on Profiles and User Roles
-- The "Fallback for invite setup" clause (auth.role() = 'anon') let any caller holding the
-- public anon key insert arbitrary profiles and grant any role, including super_admin.
-- Registration and invite setup only write after signUp/signIn has established a session,
-- so inserts are restricted to authenticated users.

-- 1. PROFILES: users create their own profile; Super-Admins create any
DROP POLICY IF EXISTS "User or Admin insert profiles" ON public.profiles;
CREATE POLICY "User or Admin insert profiles" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = id OR public.is_super_admin(auth.uid())
    );

-- 2. USER_ROLES: Super-Admins grant any role; users may only self-insert the base 'trainer' role
DROP POLICY IF EXISTS "Admin or self-trainer insert user roles" ON public.user_roles;
CREATE POLICY "Admin or self-trainer insert user roles" ON public.user_roles
    FOR INSERT TO authenticated WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        (profile_id = auth.uid() AND role = 'trainer')
    );
