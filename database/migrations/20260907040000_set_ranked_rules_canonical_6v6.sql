-- Migration: 20260907040000_set_ranked_rules_canonical_6v6.sql
-- Description: Update ranked_rules_config to canonical 6v6 tournament format and sync active season rules.

UPDATE public.ranked_rules_config
SET
    season_name = 'Frontera Kanto & Johto',
    config = '{"name":"Frontera Kanto & Johto","maxPokemon":6,"levelCap":50,"allowedTypes":[],"bannedPokemonIds":[]}'::jsonb,
    updated_at = NOW()
WHERE id = 'current';

INSERT INTO public.ranked_rules_config (id, season_name, config, updated_at)
VALUES (
    'current',
    'Frontera Kanto & Johto',
    '{"name":"Frontera Kanto & Johto","maxPokemon":6,"levelCap":50,"allowedTypes":[],"bannedPokemonIds":[]}'::jsonb,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    season_name = EXCLUDED.season_name,
    config = EXCLUDED.config,
    updated_at = NOW();

INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260907040000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
