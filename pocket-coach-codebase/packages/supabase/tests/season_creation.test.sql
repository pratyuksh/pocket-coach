-- PocketCoach Database Tests (pgTAP): Sub-Phase 1.4t season creation
-- create_season (atomic, validated, rolls back completely on failure) and the content of the
-- sessions that generate_season_sessions produces. Run with `pnpm test:db`.
-- Seed accounts: headtrainer (…002), trainer1 (…003). Seeded halls: Borrweg, Apfelbaum, Wolfsblick.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(29);

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

CREATE FUNCTION pg_temp.hall(p_name TEXT) RETURNS TEXT LANGUAGE sql AS $$
    SELECT id::text FROM public.locations WHERE name = p_name;
$$;

CREATE FUNCTION pg_temp.groups_json() RETURNS JSONB LANGUAGE sql AS $$
    SELECT '[{"name":"Kids / Basic","description":"Beginners","sort_order":1},
             {"name":"Advanced-1","description":"","sort_order":2},
             {"name":"Advanced-2","description":"","sort_order":3}]'::jsonb;
$$;

-- Tuesday: all groups at Borrweg with explicit targets 3 + 1.
-- Wednesday: Kids / Basic at Wolfsblick, targets omitted (default for Wednesday: 2 + 1).
CREATE FUNCTION pg_temp.slots_json() RETURNS JSONB LANGUAGE sql AS $$
    SELECT jsonb_build_array(
        jsonb_build_object('day_of_week', 2, 'default_start_time', '17:30:00', 'default_end_time', '19:00:00',
            'location_id', pg_temp.hall('Sporthalle Borrweg'),
            'player_group_names', jsonb_build_array('Kids / Basic', 'Advanced-1', 'Advanced-2'),
            'required_regular', 3, 'required_junior', 1),
        jsonb_build_object('day_of_week', 3, 'default_start_time', '17:30:00', 'default_end_time', '18:30:00',
            'location_id', pg_temp.hall('Sporthalle Wolfsblick'),
            'player_group_names', jsonb_build_array('Kids / Basic'))
    );
$$;

-- A currently active season that create_season must deactivate
INSERT INTO public.seasons (id, name, start_date, end_date, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'Old Active Season', '2026-08-01', '2027-07-31', TRUE);

-- ==================================================================
-- Authorization
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT throws_ok(
    $$ SELECT public.create_season('Trainer Season', '2027-02-01', '2027-02-14', TRUE, pg_temp.groups_json(), pg_temp.slots_json()) $$,
    '42501', 'not_authorized', 'a trainer cannot create a season');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok(
    $$ SELECT public.create_season('Anon Season', '2027-02-01', '2027-02-14', TRUE, '[]'::jsonb, '[]'::jsonb) $$,
    '42501', NULL, 'anon cannot execute create_season');
RESET ROLE;

-- ==================================================================
-- Happy path (Head-trainer): 2027-02-01 is a Monday, so two weeks hold 2 Tuesdays and 2 Wednesdays
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    (public.create_season('Created Season', '2027-02-01', '2027-02-14', TRUE, pg_temp.groups_json(), pg_temp.slots_json())->>'generated')::int,
    4, 'create_season returns the number of generated sessions');
RESET ROLE;

SELECT is((SELECT count(*)::int FROM public.seasons WHERE is_active), 1, 'exactly one season is active afterwards');
SELECT is((SELECT name FROM public.seasons WHERE is_active), 'Created Season', 'the new season is the active one');
SELECT is((SELECT is_active FROM public.seasons WHERE id = '11111111-1111-1111-1111-111111111111'), FALSE, 'the previously active season was deactivated');
SELECT is(
    (SELECT count(*)::int FROM public.player_groups pg JOIN public.seasons s ON s.id = pg.season_id WHERE s.name = 'Created Season'),
    3, 'three player groups were created');
SELECT results_eq(
    $$ SELECT td.day_of_week::int, td.required_regular::int, td.required_junior::int, l.name
         FROM public.training_days td JOIN public.seasons s ON s.id = td.season_id JOIN public.locations l ON l.id = td.location_id
        WHERE s.name = 'Created Season' ORDER BY td.day_of_week $$,
    $$ VALUES (2, 3, 1, 'Sporthalle Borrweg'), (3, 2, 1, 'Sporthalle Wolfsblick') $$,
    'training days carry their hall and targets; an omitted Wednesday target defaults to 2 + 1');
SELECT results_eq(
    $$ SELECT td.day_of_week::int, count(l.*)::int
         FROM public.training_days td JOIN public.seasons s ON s.id = td.season_id
         LEFT JOIN public.training_day_player_groups l ON l.training_day_id = td.id
        WHERE s.name = 'Created Season' GROUP BY td.day_of_week ORDER BY td.day_of_week $$,
    $$ VALUES (2, 3), (3, 1) $$,
    'the player groups are linked to the right training days');

-- Generated sessions
SELECT results_eq(
    $$ SELECT session_date::text FROM public.sessions s JOIN public.seasons x ON x.id = s.season_id
        WHERE x.name = 'Created Season' ORDER BY session_date $$,
    $$ VALUES ('2027-02-02'), ('2027-02-03'), ('2027-02-09'), ('2027-02-10') $$,
    'sessions fall on the Tuesdays and Wednesdays of the range only');
SELECT results_eq(
    $$ SELECT s.day_of_week::int, s.start_time::text, s.end_time::text, s.required_regular::int, s.required_junior::int, l.name, s.published_at IS NULL
         FROM public.sessions s JOIN public.seasons x ON x.id = s.season_id JOIN public.locations l ON l.id = s.location_id
        WHERE x.name = 'Created Season' ORDER BY s.session_date $$,
    $$ VALUES (2, '17:30:00', '19:00:00', 3, 1, 'Sporthalle Borrweg', TRUE),
              (3, '17:30:00', '18:30:00', 2, 1, 'Sporthalle Wolfsblick', TRUE),
              (2, '17:30:00', '19:00:00', 3, 1, 'Sporthalle Borrweg', TRUE),
              (3, '17:30:00', '18:30:00', 2, 1, 'Sporthalle Wolfsblick', TRUE) $$,
    'each session copies its times, hall and staffing targets, and starts as a draft');
SELECT is(
    (SELECT count(*)::int FROM public.session_player_groups spg JOIN public.sessions s ON s.id = spg.session_id
       JOIN public.seasons x ON x.id = s.season_id WHERE x.name = 'Created Season'),
    8, 'sessions copy the player groups of their training day (3 + 1 + 3 + 1)');

-- ==================================================================
-- Not active: the active season stays active
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT lives_ok(
    $$ SELECT public.create_season('Inactive Season', '2027-03-01', '2027-03-07', FALSE, pg_temp.groups_json(), pg_temp.slots_json()) $$,
    'a season can be created without making it active');
RESET ROLE;
SELECT is((SELECT name FROM public.seasons WHERE is_active), 'Created Season', 'creating an inactive season leaves the active one unchanged');

-- ==================================================================
-- Rollback: a failure partway undoes everything, including the deactivation
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT throws_ok(
    $$ SELECT public.create_season('Rolled Back Season', '2027-04-01', '2027-04-07', TRUE,
        '[{"name":"RB Group","description":"","sort_order":1}]'::jsonb,
        '[{"day_of_week":2,"default_start_time":"17:30:00","default_end_time":"19:00:00",
           "location_id":"00000000-0000-0000-0000-00000000dead","player_group_names":["RB Group"]}]'::jsonb) $$,
    '23503', NULL, 'a failure after the season and groups were written raises the database error');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.seasons WHERE name = 'Rolled Back Season'), 0, 'no half-built season remains');
SELECT is((SELECT count(*)::int FROM public.player_groups WHERE name = 'RB Group'), 0, 'no orphan player group remains');
SELECT is((SELECT name FROM public.seasons WHERE is_active), 'Created Season', 'the previously active season is still active after the failure');

-- ==================================================================
-- Validation: rejected before anything is written
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT throws_ok(
    $$ SELECT public.create_season('Bad Range', '2027-05-10', '2027-05-01', TRUE, '[]'::jsonb, '[]'::jsonb) $$,
    '22023', 'invalid_range', 'an end date before the start date is rejected');
SELECT throws_ok(
    $$ SELECT public.create_season('   ', '2027-05-01', '2027-05-10', TRUE, '[]'::jsonb, '[]'::jsonb) $$,
    '22023', 'invalid_input', 'a blank name is rejected');
SELECT throws_ok(
    $$ SELECT public.create_season('Bad Group', '2027-05-01', '2027-05-10', TRUE, '[]'::jsonb,
        '[{"day_of_week":2,"default_start_time":"17:30:00","default_end_time":"19:00:00","player_group_names":["Nobody"]}]'::jsonb) $$,
    '22023', 'invalid_input', 'a slot that names an unknown player group is rejected');
SELECT throws_ok(
    $$ SELECT public.create_season('Bad Target', '2027-05-01', '2027-05-10', TRUE, '[]'::jsonb,
        '[{"day_of_week":2,"default_start_time":"17:30:00","default_end_time":"19:00:00","required_regular":4}]'::jsonb) $$,
    '22023', 'invalid_input', 'a staffing target above the limit of 3 is rejected');
SELECT throws_ok(
    $$ SELECT public.create_season('Bad Time', '2027-05-01', '2027-05-10', TRUE, '[]'::jsonb,
        '[{"day_of_week":2,"default_start_time":"19:00:00","default_end_time":"17:30:00"}]'::jsonb) $$,
    '22023', 'invalid_input', 'a slot that ends before it starts is rejected');
RESET ROLE;
SELECT is(
    (SELECT count(*)::int FROM public.seasons WHERE name IN ('Bad Range', 'Bad Group', 'Bad Target', 'Bad Time')),
    0, 'rejected requests create nothing');
SELECT is((SELECT name FROM public.seasons WHERE is_active), 'Created Season', 'and do not change which season is active');

-- ==================================================================
-- generate_season_sessions on a hand-built season (independent of create_season)
-- 2027-03-15 is a Monday; Tue 16 / 23, Wed 17 / 24, Fri 19 / 26 fall in the range
-- ==================================================================
INSERT INTO public.seasons (id, name, start_date, end_date, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'Generated Season', '2027-03-15', '2027-03-28', FALSE);
INSERT INTO public.player_groups (id, season_id, name)
VALUES ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', 'G1'),
       ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'G2');
INSERT INTO public.training_days (id, season_id, day_of_week, default_start_time, default_end_time, location_id, required_regular, required_junior)
VALUES
    ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 2, '17:30', '19:00', pg_temp.hall('Sporthalle Schulhaus Apfelbaum')::uuid, 3, 1),
    ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 3, '18:15', '19:45', pg_temp.hall('Sporthalle Borrweg')::uuid, 2, 1),
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 5, '17:30', '19:00', pg_temp.hall('Sporthalle Wolfsblick')::uuid, 3, 1);
INSERT INTO public.training_day_player_groups (training_day_id, player_group_id)
VALUES ('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444441'),
       ('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444442'),
       ('33333333-3333-3333-3333-333333333332', '44444444-4444-4444-4444-444444444442');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT is(public.generate_season_sessions('22222222-2222-2222-2222-222222222222'), 6, 'one session per slot per matching day');
RESET ROLE;

SELECT results_eq(
    $$ SELECT session_date::text, day_of_week::int, required_regular::int, l.name
         FROM public.sessions s JOIN public.locations l ON l.id = s.location_id
        WHERE s.season_id = '22222222-2222-2222-2222-222222222222' ORDER BY session_date $$,
    $$ VALUES ('2027-03-16', 2, 3, 'Sporthalle Schulhaus Apfelbaum'), ('2027-03-17', 3, 2, 'Sporthalle Borrweg'),
              ('2027-03-19', 5, 3, 'Sporthalle Wolfsblick'), ('2027-03-23', 2, 3, 'Sporthalle Schulhaus Apfelbaum'),
              ('2027-03-24', 3, 2, 'Sporthalle Borrweg'), ('2027-03-26', 5, 3, 'Sporthalle Wolfsblick') $$,
    'dates, weekdays, halls and regular targets are copied from the training days');
SELECT is(
    (SELECT count(*)::int FROM public.session_player_groups spg JOIN public.sessions s ON s.id = spg.session_id
      WHERE s.season_id = '22222222-2222-2222-2222-222222222222'),
    6, 'player groups are copied: 2 per Tuesday, 1 per Wednesday, none for the Friday slot');
SELECT is(
    (SELECT count(*)::int FROM public.sessions WHERE season_id = '22222222-2222-2222-2222-222222222222' AND published_at IS NOT NULL),
    0, 'generated sessions are drafts');

SELECT * FROM finish();
ROLLBACK;
