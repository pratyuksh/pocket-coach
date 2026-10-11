-- PocketCoach Migration (Sub-Phase 1.4c): Publishing
--
-- Sessions start as drafts that only Head-trainers and Super-admins can see. Publishing a date
-- range makes the sessions and their assignments visible to trainers. Unpublishing returns a
-- range to draft, but only for sessions that have not started and have no substitution requests.
-- Existing sessions are backfilled as published so current data stays visible.

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.sessions SET published_at = NOW() WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_season_published ON public.sessions (season_id, published_at);

-- READ RULES: trainers see published sessions only; Head-trainer+ see everything
DROP POLICY IF EXISTS "Authenticated read sessions" ON public.sessions;
CREATE POLICY "Read published sessions or all for Head-trainer" ON public.sessions
    FOR SELECT TO authenticated USING (
        published_at IS NOT NULL OR public.is_head_trainer(auth.uid())
    );

DROP POLICY IF EXISTS "Authenticated read session player groups" ON public.session_player_groups;
CREATE POLICY "Read published session player groups or all for Head-trainer" ON public.session_player_groups
    FOR SELECT TO authenticated USING (
        public.is_head_trainer(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_player_groups.session_id AND s.published_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Authenticated read session assignments" ON public.session_assignments;
CREATE POLICY "Read published session assignments or all for Head-trainer" ON public.session_assignments
    FOR SELECT TO authenticated USING (
        public.is_head_trainer(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_assignments.session_id AND s.published_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Authenticated read substitution requests" ON public.substitution_requests;
CREATE POLICY "Read published substitution requests or all for Head-trainer" ON public.substitution_requests
    FOR SELECT TO authenticated USING (
        public.is_head_trainer(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = substitution_requests.session_id AND s.published_at IS NOT NULL
        )
    );

-- PUBLISH: returns {"published": n}
CREATE OR REPLACE FUNCTION public.publish_sessions(p_season_id UUID, p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_head_trainer(auth.uid()) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RAISE EXCEPTION 'invalid_range' USING ERRCODE = '22023';
    END IF;

    UPDATE public.sessions
    SET published_at = NOW()
    WHERE season_id = p_season_id
      AND session_date BETWEEN p_from AND p_to
      AND published_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN jsonb_build_object('published', v_count);
END;
$$;

-- UNPUBLISH: returns {"unpublished": n, "skipped": m}. Only sessions that have not started
-- (Europe/Zurich) and have no substitution requests go back to draft; the rest are skipped.
CREATE OR REPLACE FUNCTION public.unpublish_sessions(p_season_id UUID, p_from DATE, p_to DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unpublished INTEGER;
    v_total INTEGER;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_head_trainer(auth.uid()) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RAISE EXCEPTION 'invalid_range' USING ERRCODE = '22023';
    END IF;

    SELECT count(*) INTO v_total
    FROM public.sessions
    WHERE season_id = p_season_id
      AND session_date BETWEEN p_from AND p_to
      AND published_at IS NOT NULL;

    UPDATE public.sessions s
    SET published_at = NULL
    WHERE s.season_id = p_season_id
      AND s.session_date BETWEEN p_from AND p_to
      AND s.published_at IS NOT NULL
      AND (s.session_date + s.start_time) > (now() AT TIME ZONE 'Europe/Zurich')
      AND NOT EXISTS (SELECT 1 FROM public.substitution_requests r WHERE r.session_id = s.id);

    GET DIAGNOSTICS v_unpublished = ROW_COUNT;
    RETURN jsonb_build_object('unpublished', v_unpublished, 'skipped', v_total - v_unpublished);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_sessions(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_sessions(UUID, DATE, DATE) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.unpublish_sessions(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpublish_sessions(UUID, DATE, DATE) TO authenticated;
