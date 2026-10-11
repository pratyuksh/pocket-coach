-- PocketCoach Migration: Restrict Self-Created Profiles
-- Users creating their own profile (self-registration) could set admin-managed fields on insert,
-- e.g. give themselves the 14/18 Coach label. Self-inserts must now be a plain profile:
-- not a 14/18 Coach, active, and using the email of their own auth account.
-- Super-admins (invites) can still create profiles with any values.

DROP POLICY IF EXISTS "User or Admin insert profiles" ON public.profiles;
CREATE POLICY "User or Admin insert profiles" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (
        public.is_super_admin(auth.uid()) OR (
            auth.uid() = id
            AND is_junior_coach = FALSE
            AND is_active = TRUE
            AND lower(email) = lower(auth.email())
        )
    );
