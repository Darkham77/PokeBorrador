-- =====================================================
-- CREATE MISSING LEGACY TABLES
-- Date: 2026-05-19
-- Description: Restores tables queried by Composition API stores (passive_teams, war_user_points)
-- =====================================================

-- 1. Create passive_teams table
CREATE TABLE IF NOT EXISTS public.passive_teams (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    team_data JSONB,
    elo_rating INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for passive_teams
ALTER TABLE public.passive_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de equipos pasivos" ON public.passive_teams;
CREATE POLICY "Lectura pública de equipos pasivos" ON public.passive_teams 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificación de propio equipo pasivo" ON public.passive_teams;
CREATE POLICY "Modificación de propio equipo pasivo" ON public.passive_teams 
    FOR ALL USING ((select auth.uid()) = user_id);

-- 2. Create war_user_points table
CREATE TABLE IF NOT EXISTS public.war_user_points (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    map_id TEXT NOT NULL,
    week_id TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    faction TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for war_user_points
ALTER TABLE public.war_user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura propia de puntos de guerra de usuario" ON public.war_user_points;
CREATE POLICY "Lectura propia de puntos de guerra de usuario" ON public.war_user_points 
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modificación de propio puntos de guerra de usuario" ON public.war_user_points;
CREATE POLICY "Modificación de propio puntos de guerra de usuario" ON public.war_user_points 
    FOR ALL USING ((select auth.uid()) = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_war_user_points_user_id ON public.war_user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_war_user_points_week_id ON public.war_user_points(week_id);

-- 3. Update database version
INSERT INTO public.system_config (key, value) 
VALUES ('db_version', '20260519100000'::jsonb) 
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
