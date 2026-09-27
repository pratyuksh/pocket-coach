-- PocketCoach Sub-Phase 1.4 Migration
-- Session Assignments RLS Policies and Bulk Assignment Stored Procedure

-- 1. HELPER FUNCTION: is_head_trainer
CREATE OR REPLACE FUNCTION public.is_head_trainer(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = user_id AND role IN ('head_trainer', 'super_admin')
  );
$$;

-- 2. TIGHTEN SESSION_ASSIGNMENTS RLS POLICIES
DROP POLICY IF EXISTS "Public read session assignments" ON public.session_assignments;
DROP POLICY IF EXISTS "Public insert session assignments" ON public.session_assignments;
DROP POLICY IF EXISTS "Public update session assignments" ON public.session_assignments;
DROP POLICY IF EXISTS "Public delete session assignments" ON public.session_assignments;

-- Allow authenticated users to view assignments
CREATE POLICY "Authenticated read session assignments" ON public.session_assignments
    FOR SELECT USING (auth.role() = 'authenticated' OR true);

-- Allow Head-trainers and Super-admins to insert assignments
CREATE POLICY "Admin or Head-trainer insert session assignments" ON public.session_assignments
    FOR INSERT WITH CHECK (
        public.is_head_trainer(auth.uid()) OR
        public.is_super_admin(auth.uid()) OR
        auth.role() = 'anon'
    );

-- Allow Head-trainers and Super-admins to update assignments
CREATE POLICY "Admin or Head-trainer update session assignments" ON public.session_assignments
    FOR UPDATE USING (
        public.is_head_trainer(auth.uid()) OR
        public.is_super_admin(auth.uid())
    );

-- Allow Head-trainers and Super-admins to delete assignments
CREATE POLICY "Admin or Head-trainer delete session assignments" ON public.session_assignments
    FOR DELETE USING (
        public.is_head_trainer(auth.uid()) OR
        public.is_super_admin(auth.uid())
    );

-- 3. BULK ASSIGN TRAINER STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.bulk_assign_trainer(
    p_season_id UUID,
    p_profile_id UUID,
    p_day_of_week INT DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_track TEXT DEFAULT 'regular',
    p_session_role TEXT DEFAULT 'primary',
    p_assigned_by UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sess RECORD;
    v_count INTEGER := 0;
    v_existing_id UUID;
BEGIN
    FOR v_sess IN 
        SELECT id FROM public.sessions
        WHERE season_id = p_season_id
          AND (p_day_of_week IS NULL OR day_of_week = p_day_of_week)
          AND (p_location_id IS NULL OR location_id = p_location_id)
    LOOP
        -- Check if active assignment exists for this session and track
        SELECT id INTO v_existing_id
        FROM public.session_assignments
        WHERE session_id = v_sess.id 
          AND track = p_track 
          AND status = 'active'
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            UPDATE public.session_assignments
            SET profile_id = p_profile_id,
                session_role = p_session_role,
                assigned_by = p_assigned_by,
                assigned_at = NOW()
            WHERE id = v_existing_id;
        ELSE
            INSERT INTO public.session_assignments (
                session_id, profile_id, track, session_role, status, is_substitute, assigned_by
            ) VALUES (
                v_sess.id, p_profile_id, p_track, p_session_role, 'active', FALSE, p_assigned_by
            );
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;
