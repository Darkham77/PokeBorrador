-- 1. Table for Event Configurations
CREATE TABLE IF NOT EXISTS public.events_config (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    type TEXT,
    active BOOLEAN DEFAULT false,
    manual BOOLEAN DEFAULT false,
    schedule JSONB,
    config JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Event Configurations
ALTER TABLE public.events_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read events" ON public.events_config FOR SELECT USING (true);
CREATE POLICY "Admin write events" ON public.events_config FOR ALL USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');

-- Initialize default events
INSERT INTO public.events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES 
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', false, false, '{"type": "weekly", "days": [6, 0]}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!'),
('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', false, false, '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "metric": "total_ivs", "prize": null}', '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!')
ON CONFLICT (id) DO NOTHING;

-- 2. Table for Competition Entries
CREATE TABLE IF NOT EXISTS public.competition_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES public.events_config(id),
    player_id UUID REFERENCES auth.users(id),
    player_name TEXT NOT NULL,
    player_email TEXT NOT NULL,
    data JSONB NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, player_id)
);

-- Enable RLS for Competition Entries
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can enter" ON public.competition_entries FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Players can update own entries" ON public.competition_entries FOR UPDATE USING (auth.uid() = player_id);
CREATE POLICY "Admin view all entries" ON public.competition_entries FOR SELECT USING (true);

-- 3. Table for Awards (Prizes)
CREATE TABLE IF NOT EXISTS public.awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT,
    winner_id UUID REFERENCES auth.users(id),
    winner_name TEXT NOT NULL,
    winner_email TEXT NOT NULL,
    prize JSONB NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMPTZ
);

-- Enable RLS for Awards
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view own awards" ON public.awards FOR SELECT USING (auth.uid() = winner_id);
CREATE POLICY "Players can update own awards" ON public.awards FOR UPDATE USING (auth.uid() = winner_id);
CREATE POLICY "Admin create awards" ON public.awards FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
CREATE POLICY "Admin view all awards" ON public.awards FOR SELECT USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');
