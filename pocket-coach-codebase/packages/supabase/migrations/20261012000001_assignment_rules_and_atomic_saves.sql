-- PocketCoach Migration (Sub-Phase 1.4c): Assignment rules and atomic saves
--
-- 1. Limits: at most 3 active regular trainers and 2 active 14/18 coaches per session. Only
--    ACTIVE assignments count, so a substitute can be added for a flagged-absent trainer.
-- 2. Track versus label: the junior_coach track is only for profiles with the 14/18 label, and
--    those profiles can only be on that track.
-- 3. A 14/18 label cannot change while the person has upcoming active assignments on the track
--    the change would make invalid (applies to every writer, including direct updates).
-- 4. bulk_assign_trainer skips sessions that are already full and checks track versus label.
-- 5. set_session_assignments / set_user_roles save a whole editor state in one transaction.
-- All errors use stable codes (the exception message IS the code) for translation in the app.

-- 1 + 2. ASSIGNMENT RULES (trigger)
CREATE OR REPLACE FUNCTION public.enforce_assignment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_junior BOOLEAN;
    v_cap INTEGER;
    v_count INTEGER;
BEGIN
    IF NEW.status <> 'active' OR NEW.profile_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Skip unrelated updates (for example touching assigned_at)
    IF TG_OP = 'UPDATE'
       AND OLD.profile_id IS NOT DISTINCT FROM NEW.profile_id
       AND OLD.track = NEW.track
       AND OLD.session_id = NEW.session_id
       AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT is_junior_coach INTO v_is_junior FROM public.profiles WHERE id = NEW.profile_id;
    IF v_is_junior IS NOT NULL AND (NEW.track = 'junior_coach') <> v_is_junior THEN
        RAISE EXCEPTION 'track_label_mismatch' USING ERRCODE = '23514';
    END IF;

    -- Serialize concurrent writers on this session so the count below cannot be raced
    PERFORM 1 FROM public.sessions WHERE id = NEW.session_id FOR UPDATE;

    v_cap := CASE WHEN NEW.track = 'junior_coach' THEN 2 ELSE 3 END;
    SELECT count(*) INTO v_count
    FROM public.session_assignments a
    WHERE a.session_id = NEW.session_id
      AND a.track = NEW.track
      AND a.status = 'active'
      AND a.id <> NEW.id;

    IF v_count >= v_cap THEN
        RAISE EXCEPTION 'assignment_limit_reached' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_assignment_rules ON public.session_assignments;
CREATE TRIGGER enforce_assignment_rules
    BEFORE INSERT OR UPDATE ON public.session_assignments
    FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_rules();

-- 3. LABEL CHANGE GUARD
CREATE OR REPLACE FUNCTION public.guard_label_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_junior_coach IS NOT DISTINCT FROM OLD.is_junior_coach THEN
        RETURN NEW;
    END IF;

    -- The track the person occupies today becomes invalid under the new label
    IF EXISTS (
        SELECT 1
        FROM public.session_assignments a
        JOIN public.sessions s ON s.id = a.session_id
        WHERE a.profile_id = NEW.id
          AND a.status = 'active'
          AND a.track = CASE WHEN OLD.is_junior_coach THEN 'junior_coach' ELSE 'regular' END
          AND s.session_date >= (now() AT TIME ZONE 'Europe/Zurich')::date
    ) THEN
        RAISE EXCEPTION 'label_change_blocked' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

-- BEFORE triggers fire in alphabetical order by name. The name starts with
-- protect_profile_admin_fields so the permission check (not_authorized) runs first and a
-- non-admin never learns about assignments through label_change_blocked.
DROP TRIGGER IF EXISTS guard_label_change ON public.profiles;
DROP TRIGGER IF EXISTS protect_profile_admin_fields_label_guard ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_label_guard
    BEFORE UPDATE OF is_junior_coach ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_label_change();

-- 4. BULK ASSIGN TRAINER (additive, upcoming only, skips full sessions)
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
    v_cap INTEGER;
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

    v_cap := CASE WHEN p_track = 'junior_coach' THEN 2 ELSE 3 END;

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
      ) < v_cap
    ON CONFLICT (session_id, profile_id) WHERE status = 'active' DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- 5a. SET SESSION ASSIGNMENTS (whole editor state, one transaction)
-- p_rows: [{"profile_id": "...", "track": "regular|junior_coach", "session_role": "primary|assistant_coach"}]
-- Active assignments not in the list are removed; listed trainers are added or updated.
-- Flagged-absent and replaced rows (substitution history) are never touched.
CREATE OR REPLACE FUNCTION public.set_session_assignments(p_session_id UUID, p_rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_row JSONB;
    v_profile UUID;
    v_track TEXT;
    v_role TEXT;
    v_seen UUID[] := ARRAY[]::UUID[];
    v_count INTEGER;
BEGIN
    IF v_caller IS NULL OR NOT public.is_head_trainer(v_caller) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
        RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
    END IF;

    PERFORM 1 FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
    END IF;

    -- Validate the whole list first
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        v_profile := (v_row->>'profile_id')::UUID;
        v_track := v_row->>'track';
        v_role := v_row->>'session_role';
        IF v_profile IS NULL OR v_track NOT IN ('regular', 'junior_coach') OR v_role NOT IN ('primary', 'assistant_coach') THEN
            RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
        END IF;
        IF v_profile = ANY (v_seen) THEN
            RAISE EXCEPTION 'assignment_duplicate' USING ERRCODE = '23505';
        END IF;
        v_seen := v_seen || v_profile;
    END LOOP;

    -- 1. Remove active assignments that are no longer listed
    DELETE FROM public.session_assignments
    WHERE session_id = p_session_id AND status = 'active' AND NOT (profile_id = ANY (v_seen));

    -- 2. Update changed rows, 3. insert new ones (the trigger enforces limits and track rules)
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
        v_profile := (v_row->>'profile_id')::UUID;
        v_track := v_row->>'track';
        v_role := v_row->>'session_role';

        UPDATE public.session_assignments
        SET track = v_track, session_role = v_role, assigned_by = v_caller, assigned_at = NOW()
        WHERE session_id = p_session_id AND profile_id = v_profile AND status = 'active'
          AND (track <> v_track OR session_role <> v_role);

        INSERT INTO public.session_assignments (session_id, profile_id, track, session_role, status, is_substitute, assigned_by)
        SELECT p_session_id, v_profile, v_track, v_role, 'active', FALSE, v_caller
        WHERE NOT EXISTS (
            SELECT 1 FROM public.session_assignments
            WHERE session_id = p_session_id AND profile_id = v_profile AND status = 'active'
        );
    END LOOP;

    SELECT count(*) INTO v_count
    FROM public.session_assignments WHERE session_id = p_session_id AND status = 'active';
    RETURN v_count;
END;
$$;

-- 5b. SET USER ROLES (Super-admin only; atomic; also sets the 14/18 label)
-- p_is_junior_coach NULL leaves the label unchanged. The base trainer role always stays.
CREATE OR REPLACE FUNCTION public.set_user_roles(
    p_profile_id UUID,
    p_roles TEXT[],
    p_is_junior_coach BOOLEAN DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
    v_roles TEXT[];
BEGIN
    IF v_caller IS NULL OR NOT public.is_super_admin(v_caller) THEN
        RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;

    IF p_roles IS NULL OR NOT (p_roles <@ ARRAY['trainer', 'head_trainer', 'super_admin']) THEN
        RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
        RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
    END IF;

    v_roles := ARRAY(SELECT DISTINCT r FROM unnest(p_roles || ARRAY['trainer']) AS r);

    IF p_profile_id = v_caller AND NOT ('super_admin' = ANY (v_roles)) THEN
        RAISE EXCEPTION 'cannot_remove_own_super_admin' USING ERRCODE = '42501';
    END IF;

    -- Label first: the guard trigger raises label_change_blocked, rolling everything back
    IF p_is_junior_coach IS NOT NULL THEN
        UPDATE public.profiles
        SET is_junior_coach = p_is_junior_coach, updated_at = NOW()
        WHERE id = p_profile_id AND is_junior_coach IS DISTINCT FROM p_is_junior_coach;
    END IF;

    DELETE FROM public.user_roles WHERE profile_id = p_profile_id AND NOT (role = ANY (v_roles));

    INSERT INTO public.user_roles (profile_id, role, granted_by)
    SELECT p_profile_id, r, v_caller FROM unnest(v_roles) AS r
    ON CONFLICT (profile_id, role) DO NOTHING;
END;
$$;

-- EXECUTE privileges: signed-in users only
REVOKE EXECUTE ON FUNCTION public.bulk_assign_trainer(UUID, UUID, INT, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_assign_trainer(UUID, UUID, INT, UUID, TEXT, TEXT, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_session_assignments(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_session_assignments(UUID, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_user_roles(UUID, TEXT[], BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_roles(UUID, TEXT[], BOOLEAN) TO authenticated;
