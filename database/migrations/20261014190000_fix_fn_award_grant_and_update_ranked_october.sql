-- Migration: 20261014190000_fix_fn_award_grant_and_update_ranked_october.sql
-- Description: Restore execution grant on fn_award_event_automated to authenticated role and update active ranked season rules for October (Halloween Spook).

-- 1. Restore execute permission for authenticated players on fn_award_event_automated
GRANT EXECUTE ON FUNCTION public.fn_award_event_automated(TEXT) TO authenticated, service_role;

-- 2. Update ranked_rules_config with October canonical rules, dates and type restrictions
UPDATE public.ranked_rules_config
SET
    season_name = 'Noche de Brujas',
    config = '{"name":"Noche de Brujas","maxPokemon":6,"levelCap":50,"allowedTypes":["ghost","dark","poison"],"bannedPokemonIds":[],"startDate":"2026-10-01T00:00:00","endDate":"2026-10-31T23:59:59","seasonStartDate":"2026-10-01T00:00:00","seasonEndDate":"2026-10-31T23:59:59"}'::jsonb,
    updated_at = NOW()
WHERE id = 'current';

INSERT INTO public.ranked_rules_config (id, season_name, config, updated_at)
VALUES (
    'current',
    'Noche de Brujas',
    '{"name":"Noche de Brujas","maxPokemon":6,"levelCap":50,"allowedTypes":["ghost","dark","poison"],"bannedPokemonIds":[],"startDate":"2026-10-01T00:00:00","endDate":"2026-10-31T23:59:59","seasonStartDate":"2026-10-01T00:00:00","seasonEndDate":"2026-10-31T23:59:59"}'::jsonb,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    season_name = EXCLUDED.season_name,
    config = EXCLUDED.config,
    updated_at = NOW();

-- 3. Bump monotonic DB version
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20261014190000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
