-- PocketCoach Migration (Sub-Phase 1.4t): Atomic season creation
--
-- The web app used to create a season from the browser in many separate writes: it deactivated the
-- other seasons first, then inserted the season, player groups, training days, group links, and
-- finally generated the sessions. A failure partway left a half-built season and no active season.
-- create_season does all of it in one transaction: either the whole season exists afterwards, or
-- nothing changed (including which season is active).
--
-- p_groups: [{"name", "description", "sort_order"}]
-- p_slots:  [{"day_of_week", "default_start_time", "default_end_time", "location_id",
--             "player_group_names": [...], "required_regular", "required_junior"}]
-- Missing staffing targets default to 3 regular (Wednesday 2) and 1 14/18 coach.
-- Returns {"season_id": "...", "generated": n}. Errors use stable codes.

CREATE OR REPLACE FUNCTION public.create_season(
    p_name TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_is_active BOOLEAN,
    p_groups JSONB,
    p_slots JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_season UUID;
    v_slot JSONB;
    v_group JSONB;
    v_day INTEGER;
    v_regular INTEGER;
    v_junior INTEGER;
    v_start TIME;
    v_end TIME;
    v_td UUID;
    v_name TEXT;
    v_group_id UUID;
    v_generated INTEGER;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_head_trainer(auth.uid()) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
    END IF;
    IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date THEN
        RAISE EXCEPTION 'invalid_range' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(COALESCE(p_groups, '[]'::jsonb)) <> 'array' OR jsonb_typeof(COALESCE(p_slots, '[]'::jsonb)) <> 'array' THEN
        RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
    END IF;

    -- Validate every slot before writing anything
    FOR v_slot IN SELECT * FROM jsonb_array_elements(COALESCE(p_slots, '[]'::jsonb)) LOOP
        v_day := (v_slot->>'day_of_week')::INTEGER;
        v_start := (v_slot->>'default_start_time')::TIME;
        v_end := (v_slot->>'default_end_time')::TIME;
        v_regular := COALESCE((v_slot->>'required_regular')::INTEGER, CASE WHEN v_day = 3 THEN 2 ELSE 3 END);
        v_junior := COALESCE((v_slot->>'required_junior')::INTEGER, 1);

        IF v_day IS NULL OR v_day NOT BETWEEN 0 AND 6 OR v_start IS NULL OR v_end IS NULL OR v_start >= v_end
           OR v_regular NOT BETWEEN 0 AND 3 OR v_junior NOT BETWEEN 0 AND 2 THEN
            RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
        END IF;

        FOR v_name IN SELECT jsonb_array_elements_text(COALESCE(v_slot->'player_group_names', '[]'::jsonb)) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(p_groups, '[]'::jsonb)) g WHERE g->>'name' = v_name
            ) THEN
                RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
            END IF;
        END LOOP;
    END LOOP;

    -- Only one season is active; this runs in the same transaction, so a later failure undoes it
    IF COALESCE(p_is_active, TRUE) THEN
        UPDATE public.seasons SET is_active = FALSE WHERE is_active;
    END IF;

    INSERT INTO public.seasons (name, start_date, end_date, is_active)
    VALUES (btrim(p_name), p_start_date, p_end_date, COALESCE(p_is_active, TRUE))
    RETURNING id INTO v_season;

    FOR v_group IN SELECT * FROM jsonb_array_elements(COALESCE(p_groups, '[]'::jsonb)) LOOP
        INSERT INTO public.player_groups (season_id, name, description, sort_order)
        VALUES (v_season, v_group->>'name', NULLIF(v_group->>'description', ''),
                COALESCE((v_group->>'sort_order')::INTEGER, 0));
    END LOOP;

    FOR v_slot IN SELECT * FROM jsonb_array_elements(COALESCE(p_slots, '[]'::jsonb)) LOOP
        v_day := (v_slot->>'day_of_week')::INTEGER;
        INSERT INTO public.training_days (
            season_id, day_of_week, default_start_time, default_end_time, location_id,
            required_regular, required_junior
        ) VALUES (
            v_season, v_day, (v_slot->>'default_start_time')::TIME, (v_slot->>'default_end_time')::TIME,
            NULLIF(v_slot->>'location_id', '')::UUID,
            COALESCE((v_slot->>'required_regular')::INTEGER, CASE WHEN v_day = 3 THEN 2 ELSE 3 END),
            COALESCE((v_slot->>'required_junior')::INTEGER, 1)
        ) RETURNING id INTO v_td;

        FOR v_name IN SELECT jsonb_array_elements_text(COALESCE(v_slot->'player_group_names', '[]'::jsonb)) LOOP
            SELECT id INTO v_group_id FROM public.player_groups WHERE season_id = v_season AND name = v_name;
            INSERT INTO public.training_day_player_groups (training_day_id, player_group_id)
            VALUES (v_td, v_group_id)
            ON CONFLICT (training_day_id, player_group_id) DO NOTHING;
        END LOOP;
    END LOOP;

    v_generated := public.generate_season_sessions(v_season);

    RETURN jsonb_build_object('season_id', v_season, 'generated', v_generated);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_season(TEXT, DATE, DATE, BOOLEAN, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_season(TEXT, DATE, DATE, BOOLEAN, JSONB, JSONB) TO authenticated;
