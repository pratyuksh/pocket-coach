-- Bulk assign must not staff a session beyond what that session requires.
--
-- Until now bulk_assign_trainer only stopped at the global maximum per track (3 regular, 2 junior),
-- so a session that needs two trainers (for example the Wednesday slot) could get a third, and a
-- session that needs no 14/18 coach could get one. It now stops at the session's own staffing
-- target (sessions.required_regular / required_junior), counting active assignments only.
-- Manual assignment (set_session_assignments) keeps the global maximum from enforce_assignment_rules.

CREATE OR REPLACE FUNCTION public.bulk_assign_trainer(
    p_season_id UUID,
    p_profile_id UUID,
    p_day_of_week INT DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_track TEXT DEFAULT 'regular',
    p_session_role TEXT DEFAULT 'primary',
    p_assigned_by UUID DEFAULT NULL -- ignored; auth.uid() is recorded
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_count INTEGER;
    v_is_junior BOOLEAN;
BEGIN
    IF v_caller IS NULL OR NOT public.is_head_trainer(v_caller) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    IF p_track NOT IN ('regular', 'junior_coach') OR p_session_role NOT IN ('primary', 'assistant_coach') THEN
        RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
    END IF;

    SELECT is_junior_coach INTO v_is_junior FROM public.profiles WHERE id = p_profile_id;
    IF v_is_junior IS NULL THEN
        RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF (p_track = 'junior_coach') <> v_is_junior THEN
        RAISE EXCEPTION 'track_label_mismatch' USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.session_assignments (
        session_id, profile_id, track, session_role, status, is_substitute, assigned_by
    )
    SELECT s.id, p_profile_id, p_track, p_session_role, 'active', FALSE, v_caller
    FROM public.sessions s
    WHERE s.season_id = p_season_id
      AND s.session_date >= (now() AT TIME ZONE 'Europe/Zurich')::date
      AND (p_day_of_week IS NULL OR s.day_of_week = p_day_of_week)
      AND (p_location_id IS NULL OR s.location_id = p_location_id)
      AND (
          SELECT count(*) FROM public.session_assignments a
          WHERE a.session_id = s.id AND a.track = p_track AND a.status = 'active'
      ) < CASE WHEN p_track = 'junior_coach' THEN s.required_junior ELSE s.required_regular END
    ON CONFLICT (session_id, profile_id) WHERE status = 'active' DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bulk_assign_trainer(UUID, UUID, INT, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_assign_trainer(UUID, UUID, INT, UUID, TEXT, TEXT, UUID) TO authenticated;
