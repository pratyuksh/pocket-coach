-- PocketCoach Migration: Restrict Reads to Authenticated Users
-- The earlier "Authenticated read" policies used `auth.role() = 'authenticated' OR true`,
-- which is always true and let anonymous callers read every row (including profile emails).
-- Recreate them scoped to the authenticated role.

-- 1. PROFILES
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- 2. USER_ROLES
DROP POLICY IF EXISTS "Authenticated read user roles" ON public.user_roles;
CREATE POLICY "Authenticated read user roles" ON public.user_roles
    FOR SELECT TO authenticated USING (true);

-- 3. SESSION_ASSIGNMENTS
DROP POLICY IF EXISTS "Authenticated read session assignments" ON public.session_assignments;
CREATE POLICY "Authenticated read session assignments" ON public.session_assignments
    FOR SELECT TO authenticated USING (true);

-- 4. LOCATIONS
DROP POLICY IF EXISTS "Authenticated read locations" ON public.locations;
CREATE POLICY "Authenticated read locations" ON public.locations
    FOR SELECT TO authenticated USING (true);

-- 5. SEASONS
DROP POLICY IF EXISTS "Authenticated read seasons" ON public.seasons;
CREATE POLICY "Authenticated read seasons" ON public.seasons
    FOR SELECT TO authenticated USING (true);

-- 6. SESSIONS
DROP POLICY IF EXISTS "Authenticated read sessions" ON public.sessions;
CREATE POLICY "Authenticated read sessions" ON public.sessions
    FOR SELECT TO authenticated USING (true);

-- 7. TRAINING_DAYS
DROP POLICY IF EXISTS "Authenticated read training days" ON public.training_days;
CREATE POLICY "Authenticated read training days" ON public.training_days
    FOR SELECT TO authenticated USING (true);

-- 8. PLAYER_GROUPS
DROP POLICY IF EXISTS "Authenticated read player groups" ON public.player_groups;
CREATE POLICY "Authenticated read player groups" ON public.player_groups
    FOR SELECT TO authenticated USING (true);

-- 9. SEASON_TEMPLATES
DROP POLICY IF EXISTS "Authenticated read season templates" ON public.season_templates;
CREATE POLICY "Authenticated read season templates" ON public.season_templates
    FOR SELECT TO authenticated USING (true);
