-- PocketCoach Migration: Tighten Player Group Link RLS Policies
-- Replaces the wide-open policies on the training day / session player group join tables.
-- Reads are restricted to signed-in users; writes to Head-trainers and Super-admins.

-- 1. TRAINING_DAY_PLAYER_GROUPS
DROP POLICY IF EXISTS "Public read write training day player groups" ON public.training_day_player_groups;

CREATE POLICY "Authenticated read training day player groups" ON public.training_day_player_groups
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or Head-trainer insert training day player groups" ON public.training_day_player_groups
    FOR INSERT TO authenticated WITH CHECK (public.is_head_trainer(auth.uid()));

CREATE POLICY "Admin or Head-trainer update training day player groups" ON public.training_day_player_groups
    FOR UPDATE TO authenticated USING (public.is_head_trainer(auth.uid()));

CREATE POLICY "Admin or Head-trainer delete training day player groups" ON public.training_day_player_groups
    FOR DELETE TO authenticated USING (public.is_head_trainer(auth.uid()));

-- 2. SESSION_PLAYER_GROUPS
DROP POLICY IF EXISTS "Public read write session player groups" ON public.session_player_groups;

CREATE POLICY "Authenticated read session player groups" ON public.session_player_groups
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or Head-trainer insert session player groups" ON public.session_player_groups
    FOR INSERT TO authenticated WITH CHECK (public.is_head_trainer(auth.uid()));

CREATE POLICY "Admin or Head-trainer update session player groups" ON public.session_player_groups
    FOR UPDATE TO authenticated USING (public.is_head_trainer(auth.uid()));

CREATE POLICY "Admin or Head-trainer delete session player groups" ON public.session_player_groups
    FOR DELETE TO authenticated USING (public.is_head_trainer(auth.uid()));
