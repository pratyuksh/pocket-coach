-- PocketCoach Migration: Secure SECURITY DEFINER Functions
-- generate_season_sessions and bulk_assign_trainer run as the function owner and bypass RLS,
-- so they must enforce Head-trainer / Super-admin authorization themselves.

-- 1. GENERATE SEASON SESSIONS (Head-trainer / Super-admin only)
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

-- 2. BULK ASSIGN TRAINER (Head-trainer / Super-admin only)
-- p_assigned_by is kept for signature compatibility but ignored: the caller's
-- auth.uid() is always recorded so the audit field cannot be spoofed.
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
SET search_path = public
AS $$
DECLARE
    v_sess RECORD;
    v_count INTEGER := 0;
    v_existing_id UUID;
    v_caller UUID := auth.uid();
BEGIN
    IF v_caller IS NULL OR NOT public.is_head_trainer(v_caller) THEN
        RAISE EXCEPTION 'Only Head-trainers or Super-admins can bulk assign trainers'
            USING ERRCODE = '42501';
    END IF;

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
                assigned_by = v_caller,
                assigned_at = NOW()
            WHERE id = v_existing_id;
        ELSE
            INSERT INTO public.session_assignments (
                session_id, profile_id, track, session_role, status, is_substitute, assigned_by
            ) VALUES (
                v_sess.id, p_profile_id, p_track, p_session_role, 'active', FALSE, v_caller
            );
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 3. EXECUTE PRIVILEGES: Postgres grants EXECUTE to PUBLIC by default; restrict to signed-in users.
REVOKE EXECUTE ON FUNCTION public.generate_season_sessions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_season_sessions(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.bulk_assign_trainer(UUID, UUID, INT, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_assign_trainer(UUID, UUID, INT, UUID, TEXT, TEXT, UUID) TO authenticated;
