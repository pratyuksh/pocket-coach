-- PocketCoach Database Tests (pgTAP): Sub-Phase 1.4t write permissions on core tables
-- For each core table: an anonymous caller and a regular trainer cannot insert, change or delete
-- rows; a Head-trainer can. Updates and deletes blocked by RLS affect zero rows instead of raising,
-- so they are asserted through the affected-row count. Run with `pnpm test:db`.
-- Seed accounts: admin (…001), headtrainer (…002), trainer1 (…003), junior1 (…004).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(55);

-- ------------------------------------------------------------------
-- Fixtures (created as postgres, bypassing RLS). The session is published so trainers can see it.
-- ------------------------------------------------------------------
INSERT INTO public.seasons (id, name, start_date, end_date)
VALUES ('11111111-1111-1111-1111-111111111111', 'WP Season', '2026-08-01', '2027-07-31');
INSERT INTO public.training_days (id, season_id, day_of_week, default_start_time, default_end_time)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '17:30', '19:00');
INSERT INTO public.locations (id, name) VALUES ('33333333-3333-3333-3333-333333333333', 'WP Hall');
INSERT INTO public.player_groups (id, season_id, name)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'WP Group');
INSERT INTO public.season_templates (id, name, template_data)
VALUES ('66666666-6666-6666-6666-666666666666', 'WP Template', '{}'::jsonb);
INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time, published_at)
VALUES ('51000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date + 10, 2, '17:30', '19:00', now());
INSERT INTO public.session_assignments (id, session_id, profile_id, track, session_role)
VALUES ('88000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000004', 'junior_coach', 'assistant_coach');
-- A profile that only a Super-admin may delete
INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doomed@club.de');
INSERT INTO public.profiles (id, display_name, email)
VALUES ('00000000-0000-0000-0000-0000000000d1', 'Doomed', 'doomed@club.de');

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- Number of rows an UPDATE or DELETE affected, run with the caller's privileges (RLS applies)
CREATE FUNCTION pg_temp.rows_affected(p_sql TEXT) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE n INTEGER;
BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

-- ==================================================================
-- Anonymous callers: nothing can be inserted, changed or deleted
-- ==================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok($$ INSERT INTO public.seasons (name, start_date, end_date) VALUES ('x', '2027-01-01', '2027-01-07') $$, '42501', NULL, 'anon cannot insert seasons');
SELECT throws_ok($$ INSERT INTO public.training_days (season_id, day_of_week, default_start_time, default_end_time) VALUES ('11111111-1111-1111-1111-111111111111', 3, '17:30', '19:00') $$, '42501', NULL, 'anon cannot insert training_days');
SELECT throws_ok($$ INSERT INTO public.locations (name) VALUES ('x') $$, '42501', NULL, 'anon cannot insert locations');
SELECT throws_ok($$ INSERT INTO public.player_groups (season_id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'x') $$, '42501', NULL, 'anon cannot insert player_groups');
SELECT throws_ok($$ INSERT INTO public.season_templates (name, template_data) VALUES ('x', '{}'::jsonb) $$, '42501', NULL, 'anon cannot insert season_templates');
SELECT throws_ok($$ INSERT INTO public.sessions (season_id, session_date, day_of_week, start_time, end_time) VALUES ('11111111-1111-1111-1111-111111111111', '2027-01-05', 2, '17:30', '19:00') $$, '42501', NULL, 'anon cannot insert sessions');
SELECT throws_ok($$ INSERT INTO public.session_assignments (session_id, profile_id, track, session_role) VALUES ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'regular', 'primary') $$, '42501', NULL, 'anon cannot insert session_assignments');
SELECT is(pg_temp.rows_affected($$ UPDATE public.seasons SET name = 'hacked' $$), 0, 'anon cannot update seasons');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.sessions $$), 0, 'anon cannot delete sessions');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.session_assignments $$), 0, 'anon cannot delete session_assignments');
RESET ROLE;

-- ==================================================================
-- Regular trainer (trainer1): can read, cannot write
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');

SELECT throws_ok($$ INSERT INTO public.seasons (name, start_date, end_date) VALUES ('x', '2027-01-01', '2027-01-07') $$, '42501', NULL, 'trainer cannot insert seasons');
SELECT is(pg_temp.rows_affected($$ UPDATE public.seasons SET name = 'hacked' WHERE id = '11111111-1111-1111-1111-111111111111' $$), 0, 'trainer cannot update seasons');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.seasons WHERE id = '11111111-1111-1111-1111-111111111111' $$), 0, 'trainer cannot delete seasons');

SELECT throws_ok($$ INSERT INTO public.training_days (season_id, day_of_week, default_start_time, default_end_time) VALUES ('11111111-1111-1111-1111-111111111111', 3, '17:30', '19:00') $$, '42501', NULL, 'trainer cannot insert training_days');
SELECT is(pg_temp.rows_affected($$ UPDATE public.training_days SET required_regular = 0 WHERE id = '22222222-2222-2222-2222-222222222222' $$), 0, 'trainer cannot update training_days');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.training_days WHERE id = '22222222-2222-2222-2222-222222222222' $$), 0, 'trainer cannot delete training_days');

SELECT throws_ok($$ INSERT INTO public.locations (name) VALUES ('x') $$, '42501', NULL, 'trainer cannot insert locations');
SELECT is(pg_temp.rows_affected($$ UPDATE public.locations SET address = 'hacked' WHERE id = '33333333-3333-3333-3333-333333333333' $$), 0, 'trainer cannot update locations');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.locations WHERE id = '33333333-3333-3333-3333-333333333333' $$), 0, 'trainer cannot delete locations');

SELECT throws_ok($$ INSERT INTO public.player_groups (season_id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'x') $$, '42501', NULL, 'trainer cannot insert player_groups');
SELECT is(pg_temp.rows_affected($$ UPDATE public.player_groups SET name = 'hacked' WHERE id = '44444444-4444-4444-4444-444444444444' $$), 0, 'trainer cannot update player_groups');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.player_groups WHERE id = '44444444-4444-4444-4444-444444444444' $$), 0, 'trainer cannot delete player_groups');

SELECT throws_ok($$ INSERT INTO public.season_templates (name, template_data) VALUES ('x', '{}'::jsonb) $$, '42501', NULL, 'trainer cannot insert season_templates');
SELECT is(pg_temp.rows_affected($$ UPDATE public.season_templates SET name = 'hacked' WHERE id = '66666666-6666-6666-6666-666666666666' $$), 0, 'trainer cannot update season_templates');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.season_templates WHERE id = '66666666-6666-6666-6666-666666666666' $$), 0, 'trainer cannot delete season_templates');

SELECT throws_ok($$ INSERT INTO public.sessions (season_id, session_date, day_of_week, start_time, end_time) VALUES ('11111111-1111-1111-1111-111111111111', '2027-01-05', 2, '17:30', '19:00') $$, '42501', NULL, 'trainer cannot insert sessions');
SELECT is(pg_temp.rows_affected($$ UPDATE public.sessions SET start_time = '06:00' WHERE id = '51000000-0000-0000-0000-000000000001' $$), 0, 'trainer cannot update sessions');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.sessions WHERE id = '51000000-0000-0000-0000-000000000001' $$), 0, 'trainer cannot delete sessions');

SELECT throws_ok($$ INSERT INTO public.session_assignments (session_id, profile_id, track, session_role) VALUES ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'regular', 'primary') $$, '42501', NULL, 'trainer cannot assign themselves directly');
SELECT is(pg_temp.rows_affected($$ UPDATE public.session_assignments SET session_role = 'primary' WHERE id = '88000000-0000-0000-0000-000000000001' $$), 0, 'trainer cannot update assignments');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.session_assignments WHERE id = '88000000-0000-0000-0000-000000000001' $$), 0, 'trainer cannot delete assignments');

SELECT is(pg_temp.rows_affected($$ DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000d1' $$), 0, 'trainer cannot delete profiles');
RESET ROLE;

-- ==================================================================
-- Head-trainer: can create, change and delete (and only Super-admins delete profiles)
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT lives_ok($$ INSERT INTO public.seasons (id, name, start_date, end_date) VALUES ('11111111-1111-1111-1111-1111111111a1', 'WP2', '2027-01-01', '2027-01-07') $$, 'head-trainer can insert seasons');
SELECT is(pg_temp.rows_affected($$ UPDATE public.seasons SET name = 'WP2 renamed' WHERE id = '11111111-1111-1111-1111-1111111111a1' $$), 1, 'head-trainer can update seasons');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.seasons WHERE id = '11111111-1111-1111-1111-1111111111a1' $$), 1, 'head-trainer can delete seasons');

SELECT lives_ok($$ INSERT INTO public.training_days (id, season_id, day_of_week, default_start_time, default_end_time) VALUES ('22222222-2222-2222-2222-2222222222a1', '11111111-1111-1111-1111-111111111111', 3, '17:30', '19:00') $$, 'head-trainer can insert training_days');
SELECT is(pg_temp.rows_affected($$ UPDATE public.training_days SET required_regular = 2 WHERE id = '22222222-2222-2222-2222-2222222222a1' $$), 1, 'head-trainer can update training_days');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.training_days WHERE id = '22222222-2222-2222-2222-2222222222a1' $$), 1, 'head-trainer can delete training_days');

SELECT lives_ok($$ INSERT INTO public.locations (id, name) VALUES ('33333333-3333-3333-3333-3333333333a1', 'WP Hall 2') $$, 'head-trainer can insert locations');
SELECT is(pg_temp.rows_affected($$ UPDATE public.locations SET address = 'Hallenweg 1' WHERE id = '33333333-3333-3333-3333-3333333333a1' $$), 1, 'head-trainer can update locations');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.locations WHERE id = '33333333-3333-3333-3333-3333333333a1' $$), 1, 'head-trainer can delete locations');

SELECT lives_ok($$ INSERT INTO public.player_groups (id, season_id, name) VALUES ('44444444-4444-4444-4444-4444444444a1', '11111111-1111-1111-1111-111111111111', 'WP Group 2') $$, 'head-trainer can insert player_groups');
SELECT is(pg_temp.rows_affected($$ UPDATE public.player_groups SET name = 'renamed' WHERE id = '44444444-4444-4444-4444-4444444444a1' $$), 1, 'head-trainer can update player_groups');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.player_groups WHERE id = '44444444-4444-4444-4444-4444444444a1' $$), 1, 'head-trainer can delete player_groups');

SELECT lives_ok($$ INSERT INTO public.season_templates (id, name, template_data) VALUES ('66666666-6666-6666-6666-6666666666a1', 'WP Template 2', '{}'::jsonb) $$, 'head-trainer can insert season_templates');
SELECT is(pg_temp.rows_affected($$ UPDATE public.season_templates SET name = 'renamed' WHERE id = '66666666-6666-6666-6666-6666666666a1' $$), 1, 'head-trainer can update season_templates');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.season_templates WHERE id = '66666666-6666-6666-6666-6666666666a1' $$), 1, 'head-trainer can delete season_templates');

SELECT lives_ok($$ INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time) VALUES ('51000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', '2027-01-05', 2, '17:30', '19:00') $$, 'head-trainer can insert sessions');
SELECT is(pg_temp.rows_affected($$ UPDATE public.sessions SET start_time = '18:00' WHERE id = '51000000-0000-0000-0000-0000000000a1' $$), 1, 'head-trainer can update sessions');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.sessions WHERE id = '51000000-0000-0000-0000-0000000000a1' $$), 1, 'head-trainer can delete sessions');

SELECT lives_ok($$ INSERT INTO public.session_assignments (id, session_id, profile_id, track, session_role) VALUES ('88000000-0000-0000-0000-0000000000a1', '51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'regular', 'primary') $$, 'head-trainer can insert session_assignments');
SELECT is(pg_temp.rows_affected($$ UPDATE public.session_assignments SET session_role = 'assistant_coach' WHERE id = '88000000-0000-0000-0000-0000000000a1' $$), 1, 'head-trainer can update session_assignments');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.session_assignments WHERE id = '88000000-0000-0000-0000-0000000000a1' $$), 1, 'head-trainer can delete session_assignments');

SELECT is(pg_temp.rows_affected($$ DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000d1' $$), 0, 'head-trainer cannot delete profiles');
RESET ROLE;

-- ==================================================================
-- Super-admin: the only role that may delete profiles
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001');
SELECT is(pg_temp.rows_affected($$ DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000d1' $$), 1, 'super-admin can delete profiles');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
