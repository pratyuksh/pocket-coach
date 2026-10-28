-- PocketCoach Database Tests (pgTAP): Sub-Phase 1.4c data foundations
-- Assignment limits, track versus label, atomic saves, label-change guard, bulk assign, staffing
-- targets. Run with `pnpm test:db`. Seed accounts: admin (…001), headtrainer (…002),
-- trainer1 (…003), junior1 (…004).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(37);

-- ------------------------------------------------------------------
-- Fixtures (created as postgres, bypassing RLS)
-- b1..b4: regular trainers; c1..c3: 14/18 coaches
-- ------------------------------------------------------------------
INSERT INTO auth.users (id, instance_id, aud, role, email)
SELECT id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email
FROM (VALUES
    ('00000000-0000-0000-0000-0000000000b1', 'b1@club.de'), ('00000000-0000-0000-0000-0000000000b2', 'b2@club.de'),
    ('00000000-0000-0000-0000-0000000000b3', 'b3@club.de'), ('00000000-0000-0000-0000-0000000000b4', 'b4@club.de'),
    ('00000000-0000-0000-0000-0000000000c1', 'c1@club.de'), ('00000000-0000-0000-0000-0000000000c2', 'c2@club.de'),
    ('00000000-0000-0000-0000-0000000000c3', 'c3@club.de')
) AS v(id, email);

INSERT INTO public.profiles (id, display_name, email, is_junior_coach)
SELECT id::uuid, split_part(email, '@', 1), email, email LIKE 'c%'
FROM (VALUES
    ('00000000-0000-0000-0000-0000000000b1', 'b1@club.de'), ('00000000-0000-0000-0000-0000000000b2', 'b2@club.de'),
    ('00000000-0000-0000-0000-0000000000b3', 'b3@club.de'), ('00000000-0000-0000-0000-0000000000b4', 'b4@club.de'),
    ('00000000-0000-0000-0000-0000000000c1', 'c1@club.de'), ('00000000-0000-0000-0000-0000000000c2', 'c2@club.de'),
    ('00000000-0000-0000-0000-0000000000c3', 'c3@club.de')
) AS v(id, email);

INSERT INTO public.seasons (id, name, start_date, end_date)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Season', '2026-08-01', '2027-07-31');

-- s1: upcoming, empty. s2: upcoming, three regular trainers (full). s3: past.
INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time)
VALUES
    ('51000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 10, 2, '17:30', '19:00'),
    ('51000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date + 11, 3, '17:30', '19:00'),
    ('51000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', (now() AT TIME ZONE 'Europe/Zurich')::date - 7, 2, '17:30', '19:00');

INSERT INTO public.session_assignments (session_id, profile_id, track, session_role)
VALUES
    ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'regular', 'primary'),
    ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'regular', 'primary'),
    ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b3', 'regular', 'primary');

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ==================================================================
-- Staffing targets (confirmed values)
-- ==================================================================
SELECT results_eq(
    $$ SELECT (td->>'day_of_week')::int, (td->>'required_regular')::int, (td->>'required_junior')::int
         FROM public.season_templates t, jsonb_array_elements(t.template_data->'training_days') td
        WHERE t.name = 'Standard Junior Season'
        ORDER BY 1, (td->>'default_start_time') $$,
    $$ VALUES (2, 3, 1), (3, 2, 1), (3, 2, 1), (4, 3, 1), (5, 3, 1) $$,
    'template: Tue/Thu/Fri need 3 + 1, both Wednesday slots 2 + 1');

-- ==================================================================
-- Head-trainer: atomic save, limits, track and label rules
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b2","track":"regular","session_role":"assistant_coach"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b3","track":"regular","session_role":"primary"}]'::jsonb),
    3, 'head-trainer saves three regular trainers in one call');

SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b2","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b3","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b4","track":"regular","session_role":"primary"}]'::jsonb) $$,
    '23514', 'assignment_limit_reached', 'a fourth regular trainer is rejected');

SELECT is(
    (SELECT count(*)::int FROM public.session_assignments
      WHERE session_id = '51000000-0000-0000-0000-000000000001' AND status = 'active'),
    3, 'a rejected save leaves the session unchanged');

SELECT is(
    public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000b2","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"regular","session_role":"assistant_coach"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b3","track":"regular","session_role":"primary"}]'::jsonb),
    3, 'two trainers can swap roles in one save');

SELECT results_eq(
    $$ SELECT profile_id::text, session_role FROM public.session_assignments
        WHERE session_id = '51000000-0000-0000-0000-000000000001' AND status = 'active'
          AND profile_id IN ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2')
        ORDER BY profile_id $$,
    $$ VALUES ('00000000-0000-0000-0000-0000000000b1', 'assistant_coach'),
              ('00000000-0000-0000-0000-0000000000b2', 'primary') $$,
    'the swap is persisted');

SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"regular","session_role":"assistant_coach"}]'::jsonb) $$,
    '23505', 'assignment_duplicate', 'the same trainer twice in one save is rejected');

SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"junior_coach","session_role":"assistant_coach"}]'::jsonb) $$,
    '23514', 'track_label_mismatch', 'a regular trainer cannot be on the 14/18 track');

SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000c1","track":"regular","session_role":"primary"}]'::jsonb) $$,
    '23514', 'track_label_mismatch', 'a 14/18 coach cannot be on the regular track');

SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000c1","track":"junior_coach","session_role":"assistant_coach"},
          {"profile_id":"00000000-0000-0000-0000-0000000000c2","track":"junior_coach","session_role":"assistant_coach"},
          {"profile_id":"00000000-0000-0000-0000-0000000000c3","track":"junior_coach","session_role":"assistant_coach"}]'::jsonb) $$,
    '23514', 'assignment_limit_reached', 'a third 14/18 coach is rejected');

SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-0000000000ff', '[]'::jsonb) $$,
    'P0002', 'session_not_found', 'saving an unknown session is rejected');

-- Substitution history is never touched, and flagged-absent trainers do not count toward the limit
RESET ROLE;
UPDATE public.session_assignments SET status = 'absent_pending_sub'
 WHERE session_id = '51000000-0000-0000-0000-000000000002'
   AND profile_id = '00000000-0000-0000-0000-0000000000b3';
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    public.set_session_assignments('51000000-0000-0000-0000-000000000002',
        '[{"profile_id":"00000000-0000-0000-0000-0000000000b1","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b2","track":"regular","session_role":"primary"},
          {"profile_id":"00000000-0000-0000-0000-0000000000b4","track":"regular","session_role":"primary"}]'::jsonb),
    3, 'a substitute can be added for a flagged-absent trainer (only active rows count)');

SELECT is(
    (SELECT status FROM public.session_assignments
      WHERE session_id = '51000000-0000-0000-0000-000000000002'
        AND profile_id = '00000000-0000-0000-0000-0000000000b3'),
    'absent_pending_sub', 'the flagged-absent row is left untouched');

-- ==================================================================
-- Bulk assign: skips full sessions, checks the track against the label
-- ==================================================================
SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003'),
    0, 'bulk assign adds nobody when every upcoming session is full');

RESET ROLE;
DELETE FROM public.session_assignments
 WHERE session_id = '51000000-0000-0000-0000-000000000001' AND profile_id = '00000000-0000-0000-0000-0000000000b1';
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003'),
    1, 'bulk assign fills the one upcoming session that has room and skips the full one');

SELECT throws_ok(
    $$ SELECT public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-0000000000c1', NULL, NULL, 'regular') $$,
    '23514', 'track_label_mismatch', 'bulk assign refuses a 14/18 coach on the regular track');

SELECT throws_ok(
    $$ SELECT public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000003', NULL, NULL, 'junior_coach') $$,
    '23514', 'track_label_mismatch', 'bulk assign refuses a regular trainer on the 14/18 track');

-- Bulk assign stops at the session's own staffing target, not at the global maximum: this session
-- (the only one on day 5) requires two trainers and no 14/18 coach and already has one trainer
RESET ROLE;
INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time, required_regular, required_junior)
VALUES ('51000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date + 12, 5, '17:30', '19:00', 2, 0);
INSERT INTO public.session_assignments (session_id, profile_id, track, session_role)
VALUES ('51000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b1', 'regular', 'primary');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000b4',
        5, NULL, 'regular'), 1,
    'bulk assign fills the one open position of a session that requires two trainers');
SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002',
        5, NULL, 'regular'), 0,
    'bulk assign adds no third trainer to a session that requires two (the global maximum is three)');
SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000c1',
        5, NULL, 'junior_coach'), 0,
    'bulk assign adds no 14/18 coach to a session that requires none');
RESET ROLE;
DELETE FROM public.sessions WHERE id = '51000000-0000-0000-0000-000000000004';
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

-- ==================================================================
-- Trainer and anonymous callers
-- ==================================================================
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001', '[]'::jsonb) $$,
    '42501', 'not_authorized', 'a trainer cannot save session assignments');
SELECT throws_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b1', ARRAY['head_trainer']) $$,
    '42501', 'not_authorized', 'a trainer cannot set roles');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok(
    $$ SELECT public.set_session_assignments('51000000-0000-0000-0000-000000000001', '[]'::jsonb) $$,
    '42501', NULL, 'anon cannot execute set_session_assignments');
SELECT throws_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b1', ARRAY['head_trainer']) $$,
    '42501', NULL, 'anon cannot execute set_user_roles');
RESET ROLE;

-- ==================================================================
-- Head-trainer cannot set roles (Super-admin only)
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');
SELECT throws_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b1', ARRAY['head_trainer']) $$,
    '42501', 'not_authorized', 'a head-trainer cannot set roles');
RESET ROLE;

-- ==================================================================
-- Super-admin: atomic roles, own-role protection, label guard
-- ==================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001');

SELECT lives_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b2', ARRAY['head_trainer']) $$,
    'super-admin grants a role');
SELECT results_eq(
    $$ SELECT role FROM public.user_roles WHERE profile_id = '00000000-0000-0000-0000-0000000000b2' ORDER BY role $$,
    $$ VALUES ('head_trainer'::text), ('trainer') $$,
    'the base trainer role is kept alongside the granted role');

SELECT lives_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b2', ARRAY[]::text[]) $$,
    'super-admin revokes elevated roles');
SELECT results_eq(
    $$ SELECT role FROM public.user_roles WHERE profile_id = '00000000-0000-0000-0000-0000000000b2' $$,
    $$ VALUES ('trainer'::text) $$,
    'only the base trainer role remains');

SELECT throws_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b2', ARRAY['owner']) $$,
    '22023', 'invalid_input', 'an unknown role is rejected');

SELECT throws_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-000000000001', ARRAY['head_trainer']) $$,
    '42501', 'cannot_remove_own_super_admin', 'a super-admin cannot remove their own super-admin role');
SELECT results_eq(
    $$ SELECT count(*)::int FROM public.user_roles
        WHERE profile_id = '00000000-0000-0000-0000-000000000001' AND role = 'super_admin' $$,
    $$ VALUES (1) $$,
    'the rejected change left the super-admin role in place');

-- b1 has an upcoming active regular assignment on s1/s2: the label cannot change
SELECT throws_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000b2', ARRAY['head_trainer'], TRUE) $$,
    '23514', 'label_change_blocked', 'label change blocked while upcoming assignments exist');
SELECT results_eq(
    $$ SELECT role FROM public.user_roles WHERE profile_id = '00000000-0000-0000-0000-0000000000b2' $$,
    $$ VALUES ('trainer'::text) $$,
    'a blocked label change rolls back the role change too');

-- c3 has no assignments: the label can change, and then the new track applies
SELECT lives_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000c3', ARRAY['trainer'], FALSE) $$,
    'label change allowed when there are no upcoming assignments');
SELECT is(
    (SELECT is_junior_coach FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000c3'),
    FALSE, 'the label is saved');

-- Past sessions and non-active rows do not block a label change
RESET ROLE;
INSERT INTO public.session_assignments (session_id, profile_id, track, session_role, status)
VALUES ('51000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c2', 'junior_coach', 'assistant_coach', 'active');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001');
SELECT lives_ok(
    $$ SELECT public.set_user_roles('00000000-0000-0000-0000-0000000000c2', ARRAY['trainer'], FALSE) $$,
    'a past assignment does not block a label change');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
