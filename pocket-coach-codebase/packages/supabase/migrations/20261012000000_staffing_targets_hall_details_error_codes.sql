-- PocketCoach Migration (Sub-Phase 1.4c): Staffing targets, hall details, translatable errors
--
-- 1. Staffing targets: how many trainers a session needs on each track. A published session with
--    fewer active assignments than required on a track has a coverage gap (Sub-Phase 1.5).
--    Confirmed values: Tue/Thu/Fri 3 regular + 1 14/18 coach; both Wednesday slots 2 + 1.
--    Hard maxima (3 regular, 2 14/18) are enforced by a trigger in the next migration.
-- 2. Hall details: address and a note for trainers.
-- 3. generate_season_sessions copies the targets and raises stable error codes (the message IS the
--    code) instead of English sentences, so the app can translate them.

-- 1. STAFFING TARGETS
ALTER TABLE public.training_days
    ADD COLUMN IF NOT EXISTS required_regular SMALLINT NOT NULL DEFAULT 3
        CHECK (required_regular BETWEEN 0 AND 3),
    ADD COLUMN IF NOT EXISTS required_junior SMALLINT NOT NULL DEFAULT 1
        CHECK (required_junior BETWEEN 0 AND 2);

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS required_regular SMALLINT NOT NULL DEFAULT 3
        CHECK (required_regular BETWEEN 0 AND 3),
    ADD COLUMN IF NOT EXISTS required_junior SMALLINT NOT NULL DEFAULT 1
        CHECK (required_junior BETWEEN 0 AND 2);

-- Existing rows: Wednesday (day_of_week = 3) needs 2 regular trainers, every other day 3.
UPDATE public.training_days SET required_regular = CASE WHEN day_of_week = 3 THEN 2 ELSE 3 END, required_junior = 1;
UPDATE public.sessions SET required_regular = CASE WHEN day_of_week = 3 THEN 2 ELSE 3 END, required_junior = 1;

-- Template data carries the targets for new seasons (existing keys on a slot win).
UPDATE public.season_templates
SET template_data = jsonb_set(
    template_data,
    '{training_days}',
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'required_regular', CASE WHEN (td->>'day_of_week')::int = 3 THEN 2 ELSE 3 END,
                'required_junior', 1
            ) || td
        ), '[]'::jsonb)
        FROM jsonb_array_elements(template_data->'training_days') AS td
    )
)
WHERE template_data ? 'training_days';

-- 2. HALL DETAILS (left empty: addresses are entered by the club)
ALTER TABLE public.locations
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS trainer_note TEXT;

-- 3. GENERATE SEASON SESSIONS (targets copied, stable error codes)
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
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    SELECT start_date, end_date INTO v_start_date, v_end_date
    FROM public.seasons WHERE id = p_season_id;

    IF v_start_date IS NULL THEN
        RAISE EXCEPTION 'season_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.season_id = p_season_id
          AND (s.is_time_overridden
               OR EXISTS (SELECT 1 FROM public.session_assignments a WHERE a.session_id = s.id))
    ) THEN
        RAISE EXCEPTION 'season_in_use' USING ERRCODE = '55000';
    END IF;

    DELETE FROM public.sessions WHERE season_id = p_season_id;

    v_curr_date := v_start_date;
    WHILE v_curr_date <= v_end_date LOOP
        v_dow := EXTRACT(DOW FROM v_curr_date)::SMALLINT;

        FOR v_t_day IN
            SELECT id, default_start_time, default_end_time, location_id, required_regular, required_junior
            FROM public.training_days
            WHERE season_id = p_season_id AND day_of_week = v_dow
        LOOP
            INSERT INTO public.sessions (
                season_id, session_date, day_of_week, start_time, end_time, location_id, is_time_overridden,
                required_regular, required_junior
            ) VALUES (
                p_season_id, v_curr_date, v_dow, v_t_day.default_start_time, v_t_day.default_end_time, v_t_day.location_id, FALSE,
                v_t_day.required_regular, v_t_day.required_junior
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

REVOKE EXECUTE ON FUNCTION public.generate_season_sessions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_season_sessions(UUID) TO authenticated;
