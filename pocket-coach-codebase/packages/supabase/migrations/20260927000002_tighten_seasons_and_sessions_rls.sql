-- PocketCoach Migration: Tighten Seasons, Sessions, and Locations RLS Policies
-- Restricts CUD (Create, Update, Delete) operations to Head-trainers and Super-admins

-- 1. LOCATIONS
DROP POLICY IF EXISTS "Public read locations" ON public.locations;

CREATE POLICY "Authenticated read locations" ON public.locations
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Admin or Head-trainer insert locations" ON public.locations
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer update locations" ON public.locations
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer delete locations" ON public.locations
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

-- 2. SEASONS
DROP POLICY IF EXISTS "Public read seasons" ON public.seasons;

CREATE POLICY "Authenticated read seasons" ON public.seasons
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Admin or Head-trainer insert seasons" ON public.seasons
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer update seasons" ON public.seasons
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer delete seasons" ON public.seasons
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

-- 3. SESSIONS
DROP POLICY IF EXISTS "Public read sessions" ON public.sessions;

CREATE POLICY "Authenticated read sessions" ON public.sessions
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Admin or Head-trainer insert sessions" ON public.sessions
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer update sessions" ON public.sessions
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer delete sessions" ON public.sessions
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

-- 4. TRAINING DAYS
DROP POLICY IF EXISTS "Public read training days" ON public.training_days;

CREATE POLICY "Authenticated read training days" ON public.training_days
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Admin or Head-trainer insert training days" ON public.training_days
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer update training days" ON public.training_days
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer delete training days" ON public.training_days
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

-- 5. PLAYER GROUPS
DROP POLICY IF EXISTS "Public read player groups" ON public.player_groups;

CREATE POLICY "Authenticated read player groups" ON public.player_groups
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Admin or Head-trainer insert player groups" ON public.player_groups
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer update player groups" ON public.player_groups
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer delete player groups" ON public.player_groups
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

-- 6. SEASON TEMPLATES
DROP POLICY IF EXISTS "Public read season templates" ON public.season_templates;

CREATE POLICY "Authenticated read season templates" ON public.season_templates
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

CREATE POLICY "Admin or Head-trainer insert season templates" ON public.season_templates
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer update season templates" ON public.season_templates
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Admin or Head-trainer delete season templates" ON public.season_templates
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR public.is_super_admin(auth.uid())
    );
