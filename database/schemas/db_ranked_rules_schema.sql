-- Ranked Rules: configuración de temporada
CREATE TABLE IF NOT EXISTS public.ranked_rules_config (
    id TEXT PRIMARY KEY,
    season_name TEXT NOT NULL DEFAULT 'TEMPORADA ACTUAL',
    config JSONB NOT NULL DEFAULT '{"maxPokemon":6,"levelCap":100,"allowedTypes":[],"bannedPokemonIds":[]}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ranked_rules_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ranked rules" ON public.ranked_rules_config;
CREATE POLICY "Public read ranked rules"
ON public.ranked_rules_config
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin write ranked rules" ON public.ranked_rules_config;
CREATE POLICY "Admin write ranked rules"
ON public.ranked_rules_config
FOR ALL
USING (auth.jwt()->>'email' = 'kodrol77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'kodrol77@gmail.com');

INSERT INTO public.ranked_rules_config (id, season_name, config)
VALUES (
  'current',
  'TEMPORADA ACTUAL',
  '{"maxPokemon":6,"levelCap":100,"allowedTypes":[],"bannedPokemonIds":[]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
