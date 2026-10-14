-- PocketCoach Migration (Sub-Phase 1.4d): a person's own counts and session log.
--
-- The profile page shows a person's counts and session log. As in the design, Head-trainers and
-- Super-admins see them for everyone and a trainer only for themselves. This is enforced here, not
-- only in the interface:
--   * `team_session_stats(season, profile)` takes an optional person and allows a caller who is not
--     a Head-trainer only when that person is the caller.
--   * `session_log` only lists the caller's own completed sessions, or everyone's for a
--     Head-trainer+.

DROP FUNCTION IF EXISTS public.team_session_stats(UUID);

CREATE OR REPLACE FUNCTION public.team_session_stats(p_season_id UUID, p_profile_id UUID DEFAULT NULL)
RETURNS TABLE (
    profile_id UUID,
    as_trainer INTEGER,
    as_assistant INTEGER,
    as_junior INTEGER,
    completed INTEGER,
    upcoming INTEGER,
    as_substitute INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;
    -- Everyone's counts: Head-trainer+. Otherwise only the caller's own.
    IF NOT public.is_head_trainer(auth.uid())
       AND (p_profile_id IS NULL OR p_profile_id <> auth.uid()) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH timed AS (
        SELECT
            a.profile_id AS pid,
            a.track,
            a.session_role,
            a.is_substitute,
            ((s.session_date + s.end_time) <= (now() AT TIME ZONE 'Europe/Zurich')) AS ended
        FROM public.session_assignments a
        JOIN public.sessions s ON s.id = a.session_id
        WHERE s.season_id = p_season_id
          AND a.profile_id IS NOT NULL
          AND (p_profile_id IS NULL OR a.profile_id = p_profile_id)
          AND a.status = 'active'
          AND s.published_at IS NOT NULL
    )
    SELECT
        t.pid,
        (count(*) FILTER (WHERE t.ended AND t.track = 'regular' AND t.session_role = 'primary'))::INTEGER,
        (count(*) FILTER (WHERE t.ended AND t.track = 'regular' AND t.session_role = 'assistant_coach'))::INTEGER,
        (count(*) FILTER (WHERE t.ended AND t.track = 'junior_coach'))::INTEGER,
        (count(*) FILTER (WHERE t.ended))::INTEGER,
        (count(*) FILTER (WHERE NOT t.ended))::INTEGER,
        (count(*) FILTER (WHERE t.ended AND t.is_substitute))::INTEGER
    FROM timed t
    GROUP BY t.pid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.team_session_stats(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_session_stats(UUID, UUID) TO authenticated;

CREATE OR REPLACE VIEW public.session_log
WITH (security_invoker = true) AS
SELECT
    a.id AS assignment_id,
    a.profile_id,
    a.session_id,
    s.season_id,
    s.location_id,
    s.session_date,
    s.start_time,
    s.end_time,
    a.track,
    a.session_role,
    a.is_substitute
FROM public.session_assignments a
JOIN public.sessions s ON s.id = a.session_id
WHERE a.profile_id IS NOT NULL
  AND a.status = 'active'
  AND s.published_at IS NOT NULL
  AND (s.session_date + s.end_time) <= (now() AT TIME ZONE 'Europe/Zurich')
  AND (a.profile_id = auth.uid() OR public.is_head_trainer(auth.uid()));
