-- PocketCoach Migration (Sub-Phase 1.4d): the shared definition of a completed session, and the
-- per-trainer counts the Team page shows to Head-trainers and Super-admins.
--
-- COMPLETED (basis for later pay-outs, decision 4): an assignment counts as completed when
--   * it is `active` (a flagged trainer awaiting a substitute, and a replaced trainer, did not
--     do the session; the substitute's own assignment is `active` and counts for them),
--   * its session is published, and
--   * the session has ended, in Europe/Zurich time.
-- UPCOMING: the same assignments on published sessions that have not ended yet.

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
  AND (s.session_date + s.end_time) <= (now() AT TIME ZONE 'Europe/Zurich');

REVOKE ALL ON public.session_log FROM PUBLIC, anon;
GRANT SELECT ON public.session_log TO authenticated;

-- Counts per person for one season. The split of completed sessions is disjoint:
-- the 14/18 track first, otherwise assistant coach, otherwise trainer; the three add up to
-- `completed`. `as_substitute` counts completed sessions that were taken over as a substitute.
CREATE OR REPLACE FUNCTION public.team_session_stats(p_season_id UUID)
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
    IF auth.uid() IS NULL OR NOT public.is_head_trainer(auth.uid()) THEN
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

REVOKE EXECUTE ON FUNCTION public.team_session_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_session_stats(UUID) TO authenticated;
