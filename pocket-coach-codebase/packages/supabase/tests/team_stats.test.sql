-- PocketCoach Database Tests (pgTAP): Sub-Phase 1.4d session log and team statistics
-- The shared definition of "completed" and the counts shown to Head-trainers. Run with `pnpm test:db`.
-- Seed accounts: headtrainer (…002), trainer1 (…003), junior1 (…004).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(26);

-- ------------------------------------------------------------------
-- Fixtures (created as postgres, bypassing RLS). "Past" and "future" are whole days away from
-- today so the checks do not depend on the time of day.
--   S1, S2  published, past                S3  published, past, flagged trainer (absent_pending_sub)
--   S4      published, past, replaced      S5  DRAFT, past
--   S6      published, future              S7  published, past, in ANOTHER season
--   S8      published, past, taken over by a substitute (headtrainer)
-- ------------------------------------------------------------------
INSERT INTO public.seasons (id, name, start_date, end_date) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Stats Season', '2026-01-01', '2027-12-31'),
    ('22222222-2222-2222-2222-222222222222', 'Other Season', '2025-01-01', '2025-12-31');

INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time, published_at) VALUES
    ('53000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 10, 2, '17:30', '19:00', now()),
    ('53000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 9,  3, '17:30', '19:00', now()),
    ('53000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 8,  4, '17:30', '19:00', now()),
    ('53000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 7,  5, '17:30', '19:00', now()),
    ('53000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 6,  2, '17:30', '19:00', NULL),
    ('53000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 10, 2, '17:30', '19:00', now()),
    ('53000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', (now() AT TIME ZONE 'Europe/Zurich')::date - 5,  3, '17:30', '19:00', now()),
    ('53000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 4,  4, '17:30', '19:00', now());

-- trainer1: S1 trainer, S2 assistant, S3 flagged, S4 replaced, S5 draft, S6 upcoming, S7 other season
-- junior1:  S1 on the 14/18 track
-- headtrainer: S8 as a substitute
INSERT INTO public.session_assignments (session_id, profile_id, track, session_role, status, is_substitute) VALUES
    ('53000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'regular',      'primary',         'active',             FALSE),
    ('53000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'regular',      'assistant_coach', 'active',             FALSE),
    ('53000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'regular',      'primary',         'absent_pending_sub', FALSE),
    ('53000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'regular',      'primary',         'replaced',           FALSE),
    ('53000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'regular',      'primary',         'active',             FALSE),
    ('53000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'regular',      'primary',         'active',             FALSE),
    ('53000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'regular',      'primary',         'active',             FALSE),
    ('53000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'junior_coach', 'primary',         'active',             FALSE),
    ('53000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'regular',      'primary',         'active',             TRUE);

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ==================================================================
-- Anonymous callers
-- ==================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok(
    $$ SELECT * FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') $$,
    '42501', NULL, 'anon cannot execute team_session_stats');
SELECT throws_ok(
    $$ SELECT * FROM public.session_log $$,
    '42501', NULL, 'anon cannot read the session log');
RESET ROLE;

-- ==================================================================
-- Trainer: no access to the team counts, own completed sessions in the log
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT throws_ok(
    $$ SELECT * FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') $$,
    '42501', NULL, 'a trainer cannot read the team counts');
SELECT is(
    (SELECT count(*)::int FROM public.session_log WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    3,
    'the log lists a trainer''s completed sessions: S1, S2 and the other season''s S7 (not flagged, replaced, draft or future)');
SELECT is(
    (SELECT completed FROM public.team_session_stats('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003')),
    2, 'a trainer can read their own counts');
SELECT is(
    (SELECT count(*)::int FROM public.team_session_stats('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003')),
    1, 'and only their own row');
SELECT throws_ok(
    $$ SELECT * FROM public.team_session_stats('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004') $$,
    '42501', NULL, 'a trainer cannot read another person''s counts');
SELECT is(
    (SELECT count(*)::int FROM public.session_log WHERE profile_id <> '00000000-0000-0000-0000-000000000003'),
    0, 'a trainer''s session log lists only their own sessions, not other people''s');
SELECT is(
    (SELECT count(*)::int FROM public.session_log WHERE session_id = '53000000-0000-0000-0000-000000000005'),
    0,
    'a draft session never appears in the log');
SELECT is(
    (SELECT count(*)::int FROM public.session_log WHERE session_id = '53000000-0000-0000-0000-000000000006'),
    0,
    'a future session is not in the log');
RESET ROLE;

-- ==================================================================
-- Head-trainer: counts for the season
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    (SELECT count(*)::int FROM public.team_session_stats('11111111-1111-1111-1111-111111111111')),
    3, 'one row for each person who has assignments in the season');

SELECT is(
    (SELECT as_trainer FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    1, 'trainer1: one completed session as trainer (S1)');
SELECT is(
    (SELECT as_assistant FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    1, 'trainer1: one completed session as assistant (S2)');
SELECT is(
    (SELECT as_junior FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    0, 'trainer1: none on the 14/18 track');
SELECT is(
    (SELECT completed FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    2, 'trainer1: completed = S1 + S2; the flagged, replaced, draft, future and other-season ones do not count');
SELECT is(
    (SELECT upcoming FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    1, 'trainer1: one upcoming session (S6); the draft is not counted');

SELECT is(
    (SELECT as_junior FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000004'),
    1, 'junior1: the 14/18 track is counted separately');
SELECT is(
    (SELECT completed FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000004'),
    1, 'junior1: completed adds up the split');

SELECT is(
    (SELECT as_substitute FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000002'),
    1, 'a substitute''s completed session counts for them and is marked as taken over');
SELECT is(
    (SELECT as_substitute FROM public.team_session_stats('11111111-1111-1111-1111-111111111111') WHERE profile_id = '00000000-0000-0000-0000-000000000003'),
    0, 'trainer1 has no substitute sessions');

SELECT is(
    (SELECT completed FROM public.team_session_stats('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004')),
    1, 'a Head-trainer can read one person''s counts');
SELECT is(
    (SELECT count(*)::int FROM public.team_session_stats('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004')),
    1, 'and only that person''s row');
SELECT is(
    (SELECT count(*)::int FROM public.session_log WHERE profile_id = '00000000-0000-0000-0000-000000000004'),
    1, 'a Head-trainer can read another person''s log');
SELECT is(
    (SELECT sum(completed)::int FROM public.team_session_stats('22222222-2222-2222-2222-222222222222')),
    1, 'the counts follow the season passed in (the other season has one)');
SELECT is_empty(
    $$ SELECT * FROM public.team_session_stats('99999999-9999-9999-9999-999999999999') $$,
    'an unknown season gives no rows');

SELECT is(
    (SELECT count(*)::int FROM public.session_log WHERE season_id = '11111111-1111-1111-1111-111111111111'),
    4, 'the log for the season: S1 and S2 of trainer1, S1 of junior1 and the substitute''s session');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
