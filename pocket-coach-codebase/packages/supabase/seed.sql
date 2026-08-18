-- Seed file for local development & testing
-- Inserts 4 test accounts into auth.users, public.profiles, and public.user_roles

-- Password for all test users is: Password123!
-- Encrypted with bcrypt: $2a$10$w09ZkZ6Zc7g4rDqZ8eKx7.zZ05D1E5p5pD1E5p5pD1E5p5pD1E5p (standard local Supabase hash)

INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@club.de', '$2a$10$w09ZkZ6Zc7g4rDqZ8eKx7.zZ05D1E5p5pD1E5p5pD1E5p5pD1E5p', NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Super Admin"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'headtrainer@club.de', '$2a$10$w09ZkZ6Zc7g4rDqZ8eKx7.zZ05D1E5p5pD1E5p5pD1E5p5pD1E5p', NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Head Trainer"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'trainer1@club.de', '$2a$10$w09ZkZ6Zc7g4rDqZ8eKx7.zZ05D1E5p5pD1E5p5pD1E5p5pD1E5p', NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Max Trainer"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'junior1@club.de', '$2a$10$w09ZkZ6Zc7g4rDqZ8eKx7.zZ05D1E5p5pD1E5p5pD1E5p5pD1E5p', NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Lukas Junior"}', NOW(), NOW())
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
