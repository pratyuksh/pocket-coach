-- PocketCoach Migration: Tighten Substitution, Notification, and Availability RLS Policies
-- Replaces the wide-open development policies (FOR ALL USING (true), including anon) on the
-- tables used by Sub-Phase 1.5 (substitutions), 1.6 (notifications), and Phase 2 (availability).
-- Server-side writers (SECURITY DEFINER functions, Edge Functions with the service role) bypass RLS.

-- 1. SUBSTITUTION_REQUESTS
-- Open gaps are visible to every trainer. Trainers may only open a request for themselves;
-- volunteering and escalation go through server-side functions (Sub-Phase 1.5).
DROP POLICY IF EXISTS "Public read substitution requests" ON public.substitution_requests;

CREATE POLICY "Authenticated read substitution requests" ON public.substitution_requests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Self or Head-trainer insert substitution requests" ON public.substitution_requests
    FOR INSERT TO authenticated WITH CHECK (
        public.is_head_trainer(auth.uid()) OR
        (original_trainer_id = auth.uid() AND volunteer_id IS NULL AND status = 'open')
    );

CREATE POLICY "Head-trainer update substitution requests" ON public.substitution_requests
    FOR UPDATE TO authenticated USING (public.is_head_trainer(auth.uid()));

CREATE POLICY "Head-trainer delete substitution requests" ON public.substitution_requests
    FOR DELETE TO authenticated USING (public.is_head_trainer(auth.uid()));

-- 2. NOTIFICATIONS
-- Recipients read, mark as read, and dismiss their own notifications. No client inserts:
-- notifications are created server-side (send-notification Edge Function, Sub-Phase 1.6).
DROP POLICY IF EXISTS "Public read notifications" ON public.notifications;

CREATE POLICY "Recipient read notifications" ON public.notifications
    FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY "Recipient update notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Recipient delete notifications" ON public.notifications
    FOR DELETE TO authenticated USING (recipient_id = auth.uid());

-- 3. AVAILABILITY_SURVEYS
DROP POLICY IF EXISTS "Public read availability surveys" ON public.availability_surveys;

CREATE POLICY "Authenticated read availability surveys" ON public.availability_surveys
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Head-trainer insert availability surveys" ON public.availability_surveys
    FOR INSERT TO authenticated WITH CHECK (public.is_head_trainer(auth.uid()));

CREATE POLICY "Head-trainer update availability surveys" ON public.availability_surveys
    FOR UPDATE TO authenticated USING (public.is_head_trainer(auth.uid()));

CREATE POLICY "Head-trainer delete availability surveys" ON public.availability_surveys
    FOR DELETE TO authenticated USING (public.is_head_trainer(auth.uid()));

-- 4. AVAILABILITY_RESPONSES
-- Trainers manage their own responses while the survey is open; Head-trainers see and manage all
-- (the availability matrix).
DROP POLICY IF EXISTS "Public read availability responses" ON public.availability_responses;

CREATE OR REPLACE FUNCTION public.is_survey_open(p_survey_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.availability_surveys WHERE id = p_survey_id AND status = 'open'
  );
$$;

CREATE POLICY "Self or Head-trainer read availability responses" ON public.availability_responses
    FOR SELECT TO authenticated USING (
        profile_id = auth.uid() OR public.is_head_trainer(auth.uid())
    );

CREATE POLICY "Self (open survey) or Head-trainer insert availability responses" ON public.availability_responses
    FOR INSERT TO authenticated WITH CHECK (
        public.is_head_trainer(auth.uid()) OR
        (profile_id = auth.uid() AND public.is_survey_open(survey_id))
    );

CREATE POLICY "Self (open survey) or Head-trainer update availability responses" ON public.availability_responses
    FOR UPDATE TO authenticated
    USING (
        public.is_head_trainer(auth.uid()) OR
        (profile_id = auth.uid() AND public.is_survey_open(survey_id))
    )
    WITH CHECK (
        public.is_head_trainer(auth.uid()) OR
        (profile_id = auth.uid() AND public.is_survey_open(survey_id))
    );

CREATE POLICY "Self (open survey) or Head-trainer delete availability responses" ON public.availability_responses
    FOR DELETE TO authenticated USING (
        public.is_head_trainer(auth.uid()) OR
        (profile_id = auth.uid() AND public.is_survey_open(survey_id))
    );
