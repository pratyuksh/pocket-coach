-- PocketCoach Migration: Session Assignment Integrity
-- 1. A trainer can hold at most one active assignment per session. Tracks hold several trainers
--    (2–3 regular, 1–2 14/18 coaches), so uniqueness is per (session, profile), not per track.
-- 2. bulk_assign_trainer adds the trainer to matching upcoming sessions instead of overwriting
--    an existing assignee on the track, and never rewrites past sessions.
-- 3. generate_season_sessions refuses to regenerate once a season has assignments or overrides,
--    since it deletes and recreates every session in the season.

-- 1. ONE ACTIVE ASSIGNMENT PER TRAINER PER SESSION
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_assignments_active_profile
    ON public.session_assignments (session_id, profile_id)
    WHERE status = 'active';

-- 2. BULK ASSIGN TRAINER (additive, upcoming sessions only)
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
BEGIN
    IF v_caller IS NULL OR NOT public.is_head_trainer(v_caller) THEN
        RAISE EXCEPTION 'Only Head-trainers or Super-admins can bulk assign trainers'
            USING ERRCODE = '42501';
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
    ON CONFLICT (session_id, profile_id) WHERE status = 'active' DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 3. GENERATE SEASON SESSIONS (refuse to wipe assigned or overridden sessions)
CREATE OR REPLACE FUNCTION public.generate_season_sessions(p_season_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_curr_date DATE;
    v_dow SMALLINT;
    v_t_day RECORD;
    v_session_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- is_head_trainer also covers super_admin
    IF auth.uid() IS NULL OR NOT public.is_head_trainer(auth.uid()) THEN
        RAISE EXCEPTION 'Only Head-trainers or Super-admins can generate season sessions'
            USING ERRCODE = '42501';
    END IF;

    SELECT start_date, end_date INTO v_start_date, v_end_date
    FROM public.seasons WHERE id = p_season_id;

    IF v_start_date IS NULL THEN
        RAISE EXCEPTION 'Season with ID % not found', p_season_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.season_id = p_season_id
          AND (s.is_time_overridden
               OR EXISTS (SELECT 1 FROM public.session_assignments a WHERE a.session_id = s.id))
    ) THEN
        RAISE EXCEPTION 'Season sessions cannot be regenerated: sessions already have trainer assignments or overrides'
            USING ERRCODE = '55000';
    END IF;

    DELETE FROM public.sessions WHERE season_id = p_season_id;

    v_curr_date := v_start_date;
    WHILE v_curr_date <= v_end_date LOOP
        v_dow := EXTRACT(DOW FROM v_curr_date)::SMALLINT;

        FOR v_t_day IN
            SELECT id, default_start_time, default_end_time, location_id
            FROM public.training_days
            WHERE season_id = p_season_id AND day_of_week = v_dow
        LOOP
            INSERT INTO public.sessions (
                season_id, session_date, day_of_week, start_time, end_time, location_id, is_time_overridden
            ) VALUES (
                p_season_id, v_curr_date, v_dow, v_t_day.default_start_time, v_t_day.default_end_time, v_t_day.location_id, FALSE
            ) RETURNING id INTO v_session_id;

            INSERT INTO public.session_player_groups (session_id, player_group_id)
            SELECT v_session_id, player_group_id
            FROM public.training_day_player_groups
            WHERE training_day_id = v_t_day.id;

            v_count := v_count + 1;
        END LOOP;

        v_curr_date := v_curr_date + INTERVAL '1 day';
    END LOOP;

    RETURN v_count;
END;
$$;
