-- PocketCoach Database Permission Tests (pgTAP): substitution, notification, availability tables
-- Run with `pnpm test:db`. Relies on seed.sql accounts:
-- headtrainer (…002), trainer1 (…003), junior1 (…004).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(25);

-- Fixtures (created as postgres, bypassing RLS)
INSERT INTO public.seasons (id, name, start_date, end_date)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Season', '2099-11-02', '2099-11-08');
INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time, published_at)
VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2099-11-03', 2, '17:30', '19:00', now());
INSERT INTO public.substitution_requests (id, session_id, original_trainer_id, track)
VALUES ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555',
        '00000000-0000-0000-0000-000000000004', 'junior_coach');
INSERT INTO public.notifications (id, recipient_id, event_type)
VALUES
    ('88888888-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'session_assigned'),
    ('88888888-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'session_assigned');
INSERT INTO public.availability_surveys (id, season_id, name, range_start, range_end, status)
VALUES
    ('99999999-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Open', '2099-11-02', '2099-11-08', 'open'),
    ('99999999-0000-0000-0000-00000000000c', '11111111-1111-1111-1111-111111111111', 'Closed', '2099-11-02', '2099-11-08', 'closed');
INSERT INTO public.availability_responses (survey_id, profile_id, session_id, state)
VALUES ('99999999-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000004',
        '55555555-5555-5555-5555-555555555555', 'available');

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ============================================================
-- 1. Anonymous callers
-- ============================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is_empty($$ SELECT 1 FROM public.substitution_requests $$, 'anon cannot read substitution_requests');
SELECT is_empty($$ SELECT 1 FROM public.notifications $$, 'anon cannot read notifications');
SELECT is_empty($$ SELECT 1 FROM public.availability_surveys $$, 'anon cannot read availability_surveys');
SELECT is_empty($$ SELECT 1 FROM public.availability_responses $$, 'anon cannot read availability_responses');
SELECT throws_ok(
    $$ INSERT INTO public.notifications (recipient_id, event_type)
       VALUES ('00000000-0000-0000-0000-000000000003', 'spoofed') $$,
    '42501', NULL, 'anon cannot insert notifications');

RESET ROLE;

-- ============================================================
-- 2. Regular trainer (trainer1)
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');

-- Substitution requests
SELECT isnt_empty($$ SELECT 1 FROM public.substitution_requests $$, 'trainer can read open gaps');
SELECT lives_ok(
    $$ INSERT INTO public.substitution_requests (session_id, original_trainer_id, track)
       VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000003', 'regular') $$,
    'trainer can open a substitution request for themselves');
SELECT throws_ok(
    $$ INSERT INTO public.substitution_requests (session_id, original_trainer_id, track)
       VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000004', 'junior_coach') $$,
    '42501', NULL, 'trainer cannot open a substitution request for someone else');
SELECT throws_ok(
    $$ INSERT INTO public.substitution_requests (session_id, original_trainer_id, volunteer_id, track, status)
       VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000003',
               '00000000-0000-0000-0000-000000000003', 'regular', 'filled') $$,
    '42501', NULL, 'trainer cannot create an already-filled substitution request');
UPDATE public.substitution_requests SET volunteer_id = auth.uid(), status = 'filled'
 WHERE id = '77777777-7777-7777-7777-777777777777';

-- Notifications
SELECT results_eq(
    $$ SELECT id FROM public.notifications $$,
    $$ VALUES ('88888888-0000-0000-0000-000000000003'::uuid) $$,
    'trainer sees only their own notifications');
SELECT throws_ok(
    $$ INSERT INTO public.notifications (recipient_id, event_type)
       VALUES ('00000000-0000-0000-0000-000000000004', 'spoofed') $$,
    '42501', NULL, 'trainer cannot create notifications');
SELECT lives_ok(
    $$ UPDATE public.notifications SET is_read = TRUE WHERE id = '88888888-0000-0000-0000-000000000003' $$,
    'trainer can mark own notification as read');
UPDATE public.notifications SET is_read = TRUE WHERE id = '88888888-0000-0000-0000-000000000004';

-- Availability
SELECT isnt_empty($$ SELECT 1 FROM public.availability_surveys $$, 'trainer can read surveys');
SELECT throws_ok(
    $$ INSERT INTO public.availability_surveys (season_id, name, range_start, range_end)
       VALUES ('11111111-1111-1111-1111-111111111111', 'Sneaky', '2099-11-02', '2099-11-08') $$,
    '42501', NULL, 'trainer cannot create surveys');
SELECT lives_ok(
    $$ INSERT INTO public.availability_responses (survey_id, profile_id, session_id, state)
       VALUES ('99999999-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000003',
               '55555555-5555-5555-5555-555555555555', 'tentative') $$,
    'trainer can respond to an open survey');
SELECT throws_ok(
    $$ INSERT INTO public.availability_responses (survey_id, profile_id, session_id, state)
       VALUES ('99999999-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000003',
               '55555555-5555-5555-5555-555555555555', 'available') $$,
    '42501', NULL, 'trainer cannot respond to a closed survey');
SELECT throws_ok(
    $$ INSERT INTO public.availability_responses (survey_id, profile_id, session_id, state)
       VALUES ('99999999-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000002',
               '55555555-5555-5555-5555-555555555555', 'unavailable') $$,
    '42501', NULL, 'trainer cannot respond on behalf of someone else');
SELECT is_empty(
    $$ SELECT 1 FROM public.availability_responses
        WHERE profile_id = '00000000-0000-0000-0000-000000000004' $$,
    'trainer cannot see other trainers'' availability responses');

RESET ROLE;
SELECT results_eq(
    $$ SELECT status, volunteer_id FROM public.substitution_requests
        WHERE id = '77777777-7777-7777-7777-777777777777' $$,
    $$ VALUES ('open'::text, NULL::uuid) $$,
    'trainer cannot fill a substitution request directly');
SELECT results_eq(
    $$ SELECT is_read FROM public.notifications WHERE id = '88888888-0000-0000-0000-000000000004' $$,
    $$ VALUES (FALSE) $$,
    'trainer cannot modify another user''s notification');
SELECT results_eq(
    $$ SELECT is_read FROM public.notifications WHERE id = '88888888-0000-0000-0000-000000000003' $$,
    $$ VALUES (TRUE) $$,
    'own notification is marked as read');

-- ============================================================
-- 3. Head-trainer
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    (SELECT count(*)::int FROM public.availability_responses), 2,
    'head-trainer sees all availability responses (matrix)');
SELECT lives_ok(
    $$ INSERT INTO public.availability_surveys (season_id, name, range_start, range_end)
       VALUES ('11111111-1111-1111-1111-111111111111', 'Dec', '2099-12-01', '2099-12-31') $$,
    'head-trainer can create surveys');
SELECT lives_ok(
    $$ UPDATE public.substitution_requests SET status = 'escalated', escalated_at = now()
        WHERE id = '77777777-7777-7777-7777-777777777777' $$,
    'head-trainer can update substitution requests');

RESET ROLE;
SELECT results_eq(
    $$ SELECT status FROM public.substitution_requests WHERE id = '77777777-7777-7777-7777-777777777777' $$,
    $$ VALUES ('escalated'::text) $$,
    'head-trainer substitution update is persisted');

SELECT * FROM finish();
ROLLBACK;
