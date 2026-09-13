-- Seed file for local development & testing
-- Inserts 4 test accounts into auth.users, auth.identities, public.profiles, and public.user_roles

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Password for all test users is: Password123!
-- Encrypted using PostgreSQL pgcrypto extension: extensions.crypt('Password123!', extensions.gen_salt('bf'))

INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    email_change, phone, phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin@club.de',
    extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
    '', '', '', '', '', NULL, '', '', '',
    '{"provider":"email","providers":["email"]}', '{"display_name":"Super Admin"}',
    FALSE, NOW(), NOW(), FALSE, FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'headtrainer@club.de',
    extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
    '', '', '', '', '', NULL, '', '', '',
    '{"provider":"email","providers":["email"]}', '{"display_name":"Head Trainer"}',
    FALSE, NOW(), NOW(), FALSE, FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'trainer1@club.de',
    extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
    '', '', '', '', '', NULL, '', '', '',
    '{"provider":"email","providers":["email"]}', '{"display_name":"Max Trainer"}',
    FALSE, NOW(), NOW(), FALSE, FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'junior1@club.de',
    extensions.crypt('Password123!', extensions.gen_salt('bf')), NOW(),
    '', '', '', '', '', NULL, '', '', '',
    '{"provider":"email","providers":["email"]}', '{"display_name":"Lukas Junior"}',
    FALSE, NOW(), NOW(), FALSE, FALSE
  )
ON CONFLICT (id) DO NOTHING;

-- Populate auth.identities (Required by Supabase GoTrue Auth)
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@club.de"}'::jsonb, 'email', 'admin@club.de', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"headtrainer@club.de"}'::jsonb, 'email', 'headtrainer@club.de', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"trainer1@club.de"}'::jsonb, 'email', 'trainer1@club.de', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '{"sub":"00000000-0000-0000-0000-000000000004","email":"junior1@club.de"}'::jsonb, 'email', 'junior1@club.de', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Populate Profiles
INSERT INTO public.profiles (
    id, display_name, email, avatar_url, specialty, is_junior_coach, is_active, preferred_language
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'admin@club.de', NULL, 'Club Administration & Operations', FALSE, TRUE, 'de'),
  ('00000000-0000-0000-0000-000000000002', 'Head Trainer', 'headtrainer@club.de', NULL, 'Advanced Tactics & Season Planning', FALSE, TRUE, 'de'),
  ('00000000-0000-0000-0000-000000000003', 'Max Trainer', 'trainer1@club.de', NULL, 'Youth Basic Fundamentals', FALSE, TRUE, 'de'),
  ('00000000-0000-0000-0000-000000000004', 'Lukas Junior', 'junior1@club.de', NULL, 'U18 Assistant Coach', TRUE, TRUE, 'de')
ON CONFLICT (id) DO NOTHING;

-- Populate User Roles
INSERT INTO public.user_roles (profile_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin'),
  ('00000000-0000-0000-0000-000000000001', 'trainer'),
  ('00000000-0000-0000-0000-000000000002', 'head_trainer'),
  ('00000000-0000-0000-0000-000000000002', 'trainer'),
  ('00000000-0000-0000-0000-000000000003', 'trainer'),
  ('00000000-0000-0000-0000-000000000004', 'trainer')
ON CONFLICT DO NOTHING;
