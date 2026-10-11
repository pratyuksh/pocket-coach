-- PocketCoach Migration (Sub-Phase 1.4t): Remove the anonymous insert path on session_assignments
--
-- The insert policy created in Sub-Phase 1.4 (20260927000001) contained `OR auth.role() = 'anon'`,
-- so anyone holding the public anon key could add trainers to sessions without logging in. The same
-- fallback was removed from profiles and user_roles in 20261011000003; this one was missed because
-- no test attempted a write on this table as a logged-out or regular user. Found by the new
-- write_policies test in Sub-Phase 1.4t.
--
-- Assignments are now inserted by Head-trainers and Super-admins only (is_head_trainer also covers
-- Super-admins), and only by signed-in users.

DROP POLICY IF EXISTS "Admin or Head-trainer insert session assignments" ON public.session_assignments;

CREATE POLICY "Admin or Head-trainer insert session assignments" ON public.session_assignments
    FOR INSERT TO authenticated WITH CHECK (public.is_head_trainer(auth.uid()));
