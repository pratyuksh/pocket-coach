-- PocketCoach Sub-Phase 1.3 Migration
-- Locations, Season Templates, and Automatic Session Generation

-- 1. LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    district_area TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read locations" ON public.locations FOR ALL USING (true);

-- Seed Default 3 Halls
INSERT INTO public.locations (name, district_area) VALUES
('Sporthalle Schulhaus Apfelbaum', 'Oerlikon'),
('Sporthalle Borrweg', 'Friesenberg'),
('Sporthalle Wolfsblick', 'Zürich-Affoltern')
ON CONFLICT (name) DO NOTHING;

-- 2. ADD LOCATION FK TO TRAINING_DAYS AND SESSIONS
ALTER TABLE public.training_days 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- 3. SEASON_TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.season_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    template_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on season_templates
ALTER TABLE public.season_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read season templates" ON public.season_templates FOR ALL USING (true);

-- Seed Default Junior Schedule Template
INSERT INTO public.season_templates (name, description, is_default, template_data)
VALUES (
    'Standard Junior Season',
    'Standard weekly schedule with 3 player groups (Kids/Basic, Advanced-1, Advanced-2) across Apfelbaum, Borrweg, and Wolfsblick halls.',
    TRUE,
    '{
        "player_groups": [
            {"name": "Kids / Basic", "description": "Beginners & younger players", "sort_order": 1},
            {"name": "Advanced-1", "description": "Intermediate-level players", "sort_order": 2},
            {"name": "Advanced-2", "description": "Advanced players", "sort_order": 3}
        ],
        "training_days": [
            {
                "day_of_week": 2,
                "default_start_time": "17:30:00",
                "default_end_time": "19:00:00",
                "location_name": "Sporthalle Schulhaus Apfelbaum",
                "groups": ["Kids / Basic", "Advanced-1", "Advanced-2"]
            },
            {
                "day_of_week": 3,
                "default_start_time": "17:30:00",
                "default_end_time": "18:30:00",
                "location_name": "Sporthalle Borrweg",
                "groups": ["Kids / Basic"]
            },
            {
                "day_of_week": 3,
                "default_start_time": "18:15:00",
                "default_end_time": "19:45:00",
                "location_name": "Sporthalle Borrweg",
                "groups": ["Advanced-1", "Advanced-2"]
            },
            {
                "day_of_week": 4,
                "default_start_time": "17:30:00",
                "default_end_time": "19:00:00",
                "location_name": "Sporthalle Wolfsblick",
                "groups": ["Kids / Basic", "Advanced-1", "Advanced-2"]
            },
            {
                "day_of_week": 5,
                "default_start_time": "17:30:00",
                "default_end_time": "19:00:00",
                "location_name": "Sporthalle Schulhaus Apfelbaum",
                "groups": ["Kids / Basic", "Advanced-1", "Advanced-2"]
            }
        ]
    }'::jsonb
);

-- 4. BATCH SESSION GENERATION STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.generate_season_sessions(p_season_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_curr_date DATE;
    v_dow SMALLINT;
    v_t_day RECORD;
    v_session_id UUID;
    v_count INTEGER := 0;
BEGIN
    SELECT start_date, end_date INTO v_start_date, v_end_date
    FROM public.seasons WHERE id = p_season_id;
    
    IF v_start_date IS NULL THEN
        RAISE EXCEPTION 'Season with ID % not found', p_season_id;
    END IF;

    DELETE FROM public.sessions WHERE season_id = p_season_id;

    v_curr_date := v_start_date;
    WHILE v_curr_date <= v_end_date LOOP
        v_dow := EXTRACT(DOW FROM v_curr_date)::SMALLINT;

        FOR v_t_day IN 
            SELECT id, default_start_time, default_end_time, location_id 
            FROM public.training_days 
            WHERE season_id = p_season_id AND day_of_week = v_dow
        LOOP
            INSERT INTO public.sessions (
                season_id, session_date, day_of_week, start_time, end_time, location_id, is_time_overridden
            ) VALUES (
                p_season_id, v_curr_date, v_dow, v_t_day.default_start_time, v_t_day.default_end_time, v_t_day.location_id, FALSE
            ) RETURNING id INTO v_session_id;

            INSERT INTO public.session_player_groups (session_id, player_group_id)
            SELECT v_session_id, player_group_id
            FROM public.training_day_player_groups
            WHERE training_day_id = v_t_day.id;

            v_count := v_count + 1;
        END LOOP;

        v_curr_date := v_curr_date + INTERVAL '1 day';
    END LOOP;

    RETURN v_count;
END;
$$;

-- 5. RLS POLICIES FOR JOIN TABLES
CREATE POLICY "Public read write training day player groups" ON public.training_day_player_groups FOR ALL USING (true);
CREATE POLICY "Public read write session player groups" ON public.session_player_groups FOR ALL USING (true);

