-- PocketCoach Database Tests (pgTAP): Sub-Phase 1.4c publishing
-- Draft versus published visibility, publish and unpublish rules. Run with `pnpm test:db`.
-- Seed accounts: headtrainer (…002), trainer1 (…003), junior1 (…004).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(25);

-- ------------------------------------------------------------------
-- Fixtures (created as postgres, bypassing RLS)
-- 01 published, upcoming          02 published, upcoming, has a substitution request
-- 03 published, started today     04 published, past
-- 05, 06 drafts, upcoming (05 carries an assignment, a player group and a request)
-- ------------------------------------------------------------------
INSERT INTO public.seasons (id, name, start_date, end_date)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Season', '2026-08-01', '2027-07-31');

INSERT INTO public.player_groups (id, season_id, name)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kids / Basic');

INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time, published_at)
VALUES
    ('52000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 10, 2, '17:30', '19:00', now()),
    ('52000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 11, 3, '17:30', '19:00', now()),
    ('52000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date, 2, '00:00', '23:59', now()),
    ('52000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 7, 2, '17:30', '19:00', now()),
    ('52000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 20, 2, '17:30', '19:00', NULL),
    ('52000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 21, 3, '17:30', '19:00', NULL);

INSERT INTO public.session_assignments (session_id, profile_id, track, session_role)
VALUES
    ('52000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'regular', 'primary'),
    ('52000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'regular', 'primary');

INSERT INTO public.session_player_groups (session_id, player_group_id)
VALUES
    ('52000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
    ('52000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333');

INSERT INTO public.substitution_requests (session_id, original_trainer_id, track)
VALUES
    ('52000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'regular'),
    ('52000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'regular');

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ==================================================================
-- Anonymous callers see nothing
-- ==================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT is_empty($$ SELECT 1 FROM public.sessions $$, 'anon sees no sessions');
SELECT throws_ok(
    $$ SELECT public.publish_sessions('11111111-1111-1111-1111-111111111111', current_date, current_date + 30) $$,
    '42501', NULL, 'anon cannot execute publish_sessions');
SELECT throws_ok(
    $$ SELECT public.unpublish_sessions('11111111-1111-1111-1111-111111111111', current_date, current_date + 30) $$,
    '42501', NULL, 'anon cannot execute unpublish_sessions');
RESET ROLE;

-- ==================================================================
-- Trainer: published rows only
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');

SELECT is((SELECT count(*)::int FROM public.sessions WHERE id::text LIKE '52000000-%'), 4, 'a trainer sees only the four published sessions');
SELECT is_empty(
    $$ SELECT 1 FROM public.sessions WHERE published_at IS NULL AND id::text LIKE '52000000-%' $$,
    'a trainer sees no draft session');
SELECT is(
    (SELECT count(*)::int FROM public.session_assignments WHERE session_id::text LIKE '52000000-%'), 1,
    'a trainer sees assignments of published sessions only');
SELECT is(
    (SELECT count(*)::int FROM public.session_player_groups WHERE session_id::text LIKE '52000000-%'), 1,
    'a trainer sees player groups of published sessions only');
SELECT is(
    (SELECT count(*)::int FROM public.substitution_requests WHERE session_id::text LIKE '52000000-%'), 1,
    'a trainer sees substitution requests of published sessions only');

SELECT throws_ok(
    $$ SELECT public.publish_sessions('11111111-1111-1111-1111-111111111111', current_date, current_date + 60) $$,
    '42501', 'not_authorized', 'a trainer cannot publish');
SELECT throws_ok(
    $$ SELECT public.unpublish_sessions('11111111-1111-1111-1111-111111111111', current_date, current_date + 60) $$,
    '42501', 'not_authorized', 'a trainer cannot unpublish');
RESET ROLE;

-- ==================================================================
-- Head-trainer: sees drafts, publishes and unpublishes
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is((SELECT count(*)::int FROM public.sessions WHERE id::text LIKE '52000000-%'), 6, 'a head-trainer sees drafts too');
SELECT is((SELECT count(*)::int FROM public.session_assignments WHERE session_id::text LIKE '52000000-%'), 2, 'a head-trainer sees assignments of drafts');
SELECT is((SELECT count(*)::int FROM public.substitution_requests WHERE session_id::text LIKE '52000000-%'), 2, 'a head-trainer sees requests of drafts');

SELECT throws_ok(
    $$ SELECT public.publish_sessions('11111111-1111-1111-1111-111111111111', current_date + 5, current_date) $$,
    '22023', 'invalid_range', 'a reversed date range is rejected');

SELECT is(
    public.publish_sessions('11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date + 15, (now() AT TIME ZONE 'Europe/Zurich')::date + 30),
    '{"published": 2}'::jsonb, 'publishing a range publishes its drafts');
SELECT is(
    public.publish_sessions('11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date + 15, (now() AT TIME ZONE 'Europe/Zurich')::date + 30),
    '{"published": 0}'::jsonb, 'publishing again changes nothing');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT is((SELECT count(*)::int FROM public.sessions WHERE id::text LIKE '52000000-%'), 6, 'after publishing, trainers see all six sessions');
SELECT is((SELECT count(*)::int FROM public.session_assignments WHERE session_id::text LIKE '52000000-%'), 2, 'and the assignments of the newly published sessions');
RESET ROLE;

-- Unpublish: only future sessions without substitution requests go back to draft
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT is(
    public.unpublish_sessions('11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date - 8, (now() AT TIME ZONE 'Europe/Zurich')::date + 30),
    '{"unpublished": 2, "skipped": 4}'::jsonb,
    'unpublish returns two sessions to draft and skips the started, past and request-backed ones');
RESET ROLE;

SELECT is_empty(
    $$ SELECT 1 FROM public.sessions WHERE published_at IS NULL AND id IN (
           '52000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000003',
           '52000000-0000-0000-0000-000000000004', '52000000-0000-0000-0000-000000000005') $$,
    'the sessions with a substitution request, the started one and the past one stay published');

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT is((SELECT count(*)::int FROM public.sessions WHERE id::text LIKE '52000000-%'), 4, 'after unpublishing, trainers see the four sessions that stayed published');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT is(
    public.unpublish_sessions('11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date - 8, (now() AT TIME ZONE 'Europe/Zurich')::date + 30),
    '{"unpublished": 0, "skipped": 4}'::jsonb, 'a second unpublish changes nothing');

-- Generated sessions start as drafts
RESET ROLE;
INSERT INTO public.seasons (id, name, start_date, end_date)
VALUES ('22222222-2222-2222-2222-222222222222', 'Generated Season', '2027-01-04', '2027-01-10');
INSERT INTO public.training_days (season_id, day_of_week, default_start_time, default_end_time)
VALUES ('22222222-2222-2222-2222-222222222222', 2, '17:30', '19:00');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT is(public.generate_season_sessions('22222222-2222-2222-2222-222222222222'), 1, 'one session is generated');
SELECT is(
    (SELECT count(*)::int FROM public.sessions
      WHERE season_id = '22222222-2222-2222-2222-222222222222' AND published_at IS NULL),
    1, 'a generated session starts as a draft');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT is_empty(
    $$ SELECT 1 FROM public.sessions WHERE season_id = '22222222-2222-2222-2222-222222222222' $$,
    'trainers cannot see the generated draft');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
