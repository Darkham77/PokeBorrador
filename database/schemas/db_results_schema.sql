-- 4. Table for Competition Results (Podium / History)
CREATE TABLE IF NOT EXISTS public.competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES public.events_config(id),
    winners JSONB NOT NULL, -- Array of {rank, player_name, score, player_id}
    ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Competition Results
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read results" ON public.competition_results;
CREATE POLICY "Public read results" ON public.competition_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write results" ON public.competition_results;
CREATE POLICY "Admin write results" ON public.competition_results FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
DROP POLICY IF EXISTS "Admin update results" ON public.competition_results;
CREATE POLICY "Admin update results" ON public.competition_results FOR UPDATE USING (auth.jwt()->>'email' = 'kodrol77@gmail.com');

-- Update the RLS for Awards to be more robust (optional but recommended)
DROP POLICY IF EXISTS "Admin create awards" ON public.awards;
CREATE POLICY "Admin create awards" ON public.awards FOR INSERT WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');
