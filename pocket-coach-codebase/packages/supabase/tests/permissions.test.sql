-- PocketCoach Database Permission Tests (pgTAP)
-- Verifies that SECURITY DEFINER functions and tightened RLS policies enforce
-- Head-trainer / Super-admin authorization. Run with `pnpm test:db`.
-- Relies on seed.sql accounts: admin (…001), headtrainer (…002), trainer1 (…003).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(52);

-- Fixtures (created as postgres, bypassing RLS)
INSERT INTO public.seasons (id, name, start_date, end_date)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Season', '2026-11-02', '2026-11-08');
INSERT INTO public.training_days (id, season_id, day_of_week, default_start_time, default_end_time)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, '17:30', '19:00');
INSERT INTO public.player_groups (id, season_id, name)
VALUES
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kids / Basic'),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Advanced-1');
INSERT INTO public.training_day_player_groups (training_day_id, player_group_id)
VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');
-- Placeholder session + assignment so anon read checks run against non-empty tables
-- (removed by generate_season_sessions below)
INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time)
VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '2026-11-03', 2, '17:30', '19:00');
INSERT INTO public.session_assignments (session_id, profile_id, track, session_role)
VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000003', 'regular', 'primary');

CREATE FUNCTION pg_temp.act_as(p_user UUID) RETURNS VOID LANGUAGE sql AS $$
    SELECT set_config('request.jwt.claims',
        json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- ============================================================
-- 1. Anonymous callers
-- ============================================================
SET LOCAL ROLE anon;
-- Mirror PostgREST: anon-key requests carry role=anon in the JWT claims
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
    $$ SELECT public.generate_season_sessions('11111111-1111-1111-1111-111111111111') $$,
    '42501', NULL, 'anon cannot execute generate_season_sessions');
SELECT throws_ok(
    $$ SELECT public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003') $$,
    '42501', NULL, 'anon cannot execute bulk_assign_trainer');
SELECT is_empty(
    $$ SELECT 1 FROM public.training_day_player_groups $$,
    'anon cannot read training_day_player_groups');
SELECT throws_ok(
    $$ INSERT INTO public.training_day_player_groups (training_day_id, player_group_id)
       VALUES ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444') $$,
    '42501', NULL, 'anon cannot insert training_day_player_groups');

SELECT is_empty($$ SELECT 1 FROM public.profiles $$, 'anon cannot read profiles');
SELECT is_empty($$ SELECT 1 FROM public.user_roles $$, 'anon cannot read user_roles');
SELECT is_empty($$ SELECT 1 FROM public.session_assignments $$, 'anon cannot read session_assignments');
SELECT is_empty($$ SELECT 1 FROM public.locations $$, 'anon cannot read locations');
SELECT is_empty($$ SELECT 1 FROM public.seasons $$, 'anon cannot read seasons');
SELECT is_empty($$ SELECT 1 FROM public.sessions $$, 'anon cannot read sessions');
SELECT is_empty($$ SELECT 1 FROM public.training_days $$, 'anon cannot read training_days');
SELECT is_empty($$ SELECT 1 FROM public.player_groups $$, 'anon cannot read player_groups');
SELECT is_empty($$ SELECT 1 FROM public.season_templates $$, 'anon cannot read season_templates');

SELECT throws_ok(
    $$ INSERT INTO public.user_roles (profile_id, role)
       VALUES ('00000000-0000-0000-0000-000000000003', 'super_admin') $$,
    '42501', NULL, 'anon cannot grant roles');
SELECT throws_ok(
    $$ INSERT INTO public.profiles (id, display_name, email)
       VALUES (gen_random_uuid(), 'Intruder', 'intruder@example.com') $$,
    '42501', NULL, 'anon cannot insert profiles');

RESET ROLE;

-- ============================================================
-- 2. Regular trainer (trainer1)
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');

SELECT throws_ok(
    $$ SELECT public.generate_season_sessions('11111111-1111-1111-1111-111111111111') $$,
    '42501', 'Only Head-trainers or Super-admins can generate season sessions',
    'trainer cannot generate season sessions');
SELECT throws_ok(
    $$ SELECT public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003') $$,
    '42501', 'Only Head-trainers or Super-admins can bulk assign trainers',
    'trainer cannot bulk assign');
SELECT isnt_empty(
    $$ SELECT 1 FROM public.training_day_player_groups $$,
    'trainer can read training_day_player_groups');
SELECT isnt_empty($$ SELECT 1 FROM public.profiles $$, 'trainer can read profiles');
SELECT isnt_empty($$ SELECT 1 FROM public.sessions $$, 'trainer can read sessions');
SELECT throws_ok(
    $$ INSERT INTO public.user_roles (profile_id, role)
       VALUES ('00000000-0000-0000-0000-000000000003', 'head_trainer') $$,
    '42501', NULL, 'trainer cannot self-grant head_trainer');
SELECT throws_ok(
    $$ INSERT INTO public.user_roles (profile_id, role)
       VALUES ('00000000-0000-0000-0000-000000000004', 'trainer') $$,
    '42501', NULL, 'trainer cannot grant roles to other users');

-- Self-registration: a brand-new user may only create a plain profile for themselves
RESET ROLE;
INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'newbie@club.de');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated","email":"newbie@club.de"}', true);
SELECT throws_ok(
    $$ INSERT INTO public.profiles (id, display_name, email, is_junior_coach)
       VALUES ('00000000-0000-0000-0000-0000000000aa', 'Newbie', 'newbie@club.de', TRUE) $$,
    '42501', NULL, 'new user cannot self-create a profile with the 14/18 Coach label');
SELECT throws_ok(
    $$ INSERT INTO public.profiles (id, display_name, email)
       VALUES ('00000000-0000-0000-0000-0000000000aa', 'Newbie', 'someone-else@club.de') $$,
    '42501', NULL, 'new user cannot self-create a profile with a different email');
SELECT lives_ok(
    $$ INSERT INTO public.profiles (id, display_name, email)
       VALUES ('00000000-0000-0000-0000-0000000000aa', 'Newbie', 'Newbie@club.de') $$,
    'new user can self-create a plain profile (email compared case-insensitively)');
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');

-- Own profile: self-service fields are editable, admin-managed fields are not
SELECT lives_ok(
    $$ UPDATE public.profiles SET display_name = 'Max T.', specialty = 'Footwork', calendar_token = 'new-token'
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    'trainer can edit own display name, specialty, and calendar token');
SELECT lives_ok(
    $$ UPDATE public.profiles SET is_junior_coach = is_junior_coach, is_active = is_active
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    'trainer can resubmit unchanged admin-managed fields');
SELECT throws_ok(
    $$ UPDATE public.profiles SET is_junior_coach = TRUE
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    '42501', NULL, 'trainer cannot change own 14/18 Coach label');
SELECT throws_ok(
    $$ UPDATE public.profiles SET is_active = FALSE
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    '42501', NULL, 'trainer cannot change own active status');
SELECT throws_ok(
    $$ UPDATE public.profiles SET email = 'someone-else@club.de'
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    '42501', NULL, 'trainer cannot change own email');

RESET ROLE;
INSERT INTO public.session_assignments (session_id, profile_id, track, session_role)
VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000004', 'junior_coach', 'assistant_coach');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');
SELECT isnt_empty(
    $$ SELECT 1 FROM public.session_assignments
        WHERE profile_id = '00000000-0000-0000-0000-000000000004' $$,
    'trainer can read other trainers'' assignments');
SELECT throws_ok(
    $$ INSERT INTO public.training_day_player_groups (training_day_id, player_group_id)
       VALUES ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444') $$,
    '42501', NULL, 'trainer cannot insert training_day_player_groups');

-- Blocked UPDATE/DELETE affect zero rows instead of raising
DELETE FROM public.training_day_player_groups;
UPDATE public.training_day_player_groups SET player_group_id = '44444444-4444-4444-4444-444444444444';

RESET ROLE;
SELECT results_eq(
    $$ SELECT player_group_id FROM public.training_day_player_groups
       WHERE training_day_id = '22222222-2222-2222-2222-222222222222' $$,
    $$ VALUES ('33333333-3333-3333-3333-333333333333'::uuid) $$,
    'trainer delete/update leaves training_day_player_groups unchanged');

-- ============================================================
-- 3. Head-trainer
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT throws_ok(
    $$ SELECT public.generate_season_sessions('11111111-1111-1111-1111-111111111111') $$,
    '55000', NULL,
    'regeneration is refused while sessions have assignments');

RESET ROLE;
DELETE FROM public.session_assignments WHERE session_id = '55555555-5555-5555-5555-555555555555';
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    public.generate_season_sessions('11111111-1111-1111-1111-111111111111'), 1,
    'head-trainer generates one session for one Tuesday slot');
SELECT is(
    (SELECT count(*)::int FROM public.session_player_groups spg
       JOIN public.sessions s ON s.id = spg.session_id
      WHERE s.season_id = '11111111-1111-1111-1111-111111111111'), 1,
    'generated session copies its player group link');

-- A past session in the same season must not be touched by bulk assign
RESET ROLE;
INSERT INTO public.sessions (id, season_id, session_date, day_of_week, start_time, end_time)
VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
        (now() AT TIME ZONE 'Europe/Zurich')::date - 7, 2, '17:30', '19:00');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000002');

SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003',
        p_assigned_by => '00000000-0000-0000-0000-000000000001'), 1,
    'head-trainer bulk assigns the one upcoming session');
SELECT is_empty(
    $$ SELECT 1 FROM public.session_assignments
        WHERE session_id = '66666666-6666-6666-6666-666666666666' $$,
    'bulk assign skips past sessions');
SELECT is(
    (SELECT a.assigned_by FROM public.session_assignments a
       JOIN public.sessions s ON s.id = a.session_id
      WHERE s.season_id = '11111111-1111-1111-1111-111111111111'
        AND a.profile_id = '00000000-0000-0000-0000-000000000003'),
    '00000000-0000-0000-0000-000000000002'::uuid,
    'bulk assign records the caller, ignoring a spoofed p_assigned_by');
SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003'), 0,
    'bulk assign skips sessions the trainer already has');
SELECT is(
    public.bulk_assign_trainer('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002'), 1,
    'bulk assign adds a second trainer to the same track instead of replacing the first');
SELECT is(
    (SELECT count(*)::int FROM public.session_assignments a
       JOIN public.sessions s ON s.id = a.session_id
      WHERE s.season_id = '11111111-1111-1111-1111-111111111111'
        AND a.track = 'regular' AND a.status = 'active'), 2,
    'session keeps both regular-track trainers');
SELECT throws_ok(
    $$ INSERT INTO public.session_assignments (session_id, profile_id, track, session_role)
       SELECT a.session_id, a.profile_id, 'regular', 'assistant_coach'
         FROM public.session_assignments a
        WHERE a.profile_id = '00000000-0000-0000-0000-000000000003' AND a.status = 'active' $$,
    '23505', NULL, 'a trainer cannot be actively assigned twice to the same session');
SELECT lives_ok(
    $$ INSERT INTO public.training_day_player_groups (training_day_id, player_group_id)
       VALUES ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444') $$,
    'head-trainer can insert training_day_player_groups');
SELECT lives_ok(
    $$ INSERT INTO public.session_player_groups (session_id, player_group_id)
       SELECT id, '44444444-4444-4444-4444-444444444444' FROM public.sessions
        WHERE season_id = '11111111-1111-1111-1111-111111111111' $$,
    'head-trainer can insert session_player_groups');

DELETE FROM public.session_player_groups
 WHERE player_group_id = '44444444-4444-4444-4444-444444444444';
RESET ROLE;
SELECT is_empty(
    $$ SELECT 1 FROM public.session_player_groups
        WHERE player_group_id = '44444444-4444-4444-4444-444444444444' $$,
    'head-trainer can delete session_player_groups');

-- ============================================================
-- 4. Trainer cannot modify session_player_groups
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000003');

SELECT throws_ok(
    $$ INSERT INTO public.session_player_groups (session_id, player_group_id)
       SELECT id, '44444444-4444-4444-4444-444444444444' FROM public.sessions
        WHERE season_id = '11111111-1111-1111-1111-111111111111' $$,
    '42501', NULL, 'trainer cannot insert session_player_groups');
DELETE FROM public.session_player_groups;
RESET ROLE;
SELECT isnt_empty(
    $$ SELECT 1 FROM public.session_player_groups spg
         JOIN public.sessions s ON s.id = spg.session_id
        WHERE s.season_id = '11111111-1111-1111-1111-111111111111' $$,
    'trainer delete leaves session_player_groups unchanged');

-- ============================================================
-- 5. Super-admin
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-000000000001');
-- Authorized (gets past the role check) but blocked by the regeneration guard
SELECT throws_ok(
    $$ SELECT public.generate_season_sessions('11111111-1111-1111-1111-111111111111') $$,
    '55000', NULL,
    'super-admin passes the role check; regeneration still refused once assigned');
SELECT lives_ok(
    $$ INSERT INTO public.user_roles (profile_id, role)
       VALUES ('00000000-0000-0000-0000-000000000003', 'head_trainer') $$,
    'super-admin can grant roles');
SELECT lives_ok(
    $$ UPDATE public.profiles SET is_junior_coach = TRUE, is_active = FALSE
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    'super-admin can change 14/18 Coach label and active status');
RESET ROLE;
SELECT results_eq(
    $$ SELECT is_junior_coach, is_active FROM public.profiles
        WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    $$ VALUES (TRUE, FALSE) $$,
    'super-admin profile changes are persisted');

SELECT * FROM finish();
ROLLBACK;
