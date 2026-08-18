-- PocketCoach Initial Schema Migration
-- Enables extensions and creates 1 core tables with Row-Level Security

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    specialty TEXT,
    is_junior_coach BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_language TEXT NOT NULL DEFAULT 'de',
    calendar_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER_ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('trainer', 'head_trainer', 'super_admin')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE (profile_id, role)
);

-- 3. DEVICE_TOKENS
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SEASONS
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- 5. TRAINING_DAYS
CREATE TABLE IF NOT EXISTS public.training_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    default_start_time TIME NOT NULL,
    default_end_time TIME NOT NULL
);

-- 6. PLAYER_GROUPS
CREATE TABLE IF NOT EXISTS public.player_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order SMALLINT NOT NULL DEFAULT 0
);

-- 7. TRAINING_DAY_PLAYER_GROUPS
CREATE TABLE IF NOT EXISTS public.training_day_player_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_day_id UUID NOT NULL REFERENCES public.training_days(id) ON DELETE CASCADE,
    player_group_id UUID NOT NULL REFERENCES public.player_groups(id) ON DELETE CASCADE,
    UNIQUE (training_day_id, player_group_id)
);

-- 8. SESSIONS
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    block_week_id UUID, -- Nullable extension point for Phase 2
    session_date DATE NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_time_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SESSION_PLAYER_GROUPS
CREATE TABLE IF NOT EXISTS public.session_player_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    player_group_id UUID NOT NULL REFERENCES public.player_groups(id) ON DELETE CASCADE,
    UNIQUE (session_id, player_group_id)
);

-- 10. SESSION_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.session_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    track TEXT NOT NULL CHECK (track IN ('regular', 'junior_coach')),
    session_role TEXT NOT NULL CHECK (session_role IN ('primary', 'assistant_coach')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'absent_pending_sub', 'replaced')),
    is_substitute BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 11. AVAILABILITY_SURVEYS
CREATE TABLE IF NOT EXISTS public.availability_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    range_start DATE NOT NULL,
    range_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AVAILABILITY_RESPONSES
CREATE TABLE IF NOT EXISTS public.availability_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.availability_surveys(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN ('available', 'unavailable', 'tentative')),
    responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (survey_id, profile_id, session_id)
);

-- 13. SUBSTITUTION_REQUESTS
CREATE TABLE IF NOT EXISTS public.substitution_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    original_trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    track TEXT NOT NULL CHECK (track IN ('regular', 'junior_coach')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'escalated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filled_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_day_player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_player_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies (Authenticated users can read active records, admins write)
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Public read user roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read seasons" ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read player groups" ON public.player_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read session assignments" ON public.session_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read availability surveys" ON public.availability_surveys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read availability responses" ON public.availability_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read substitution requests" ON public.substitution_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
