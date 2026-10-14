-- SQLite companion for 20261014190000_fix_fn_award_grant_and_update_ranked_october
-- Update ranked_rules_config to active October season rules with allowed types and date range.

INSERT INTO ranked_rules_config (id, season_name, config, updated_at)
VALUES (
    'current',
    'Noche de Brujas',
    '{"name":"Noche de Brujas","maxPokemon":6,"levelCap":50,"allowedTypes":["ghost","dark","poison"],"bannedPokemonIds":[],"startDate":"2026-10-01T00:00:00","endDate":"2026-10-31T23:59:59","seasonStartDate":"2026-10-01T00:00:00","seasonEndDate":"2026-10-31T23:59:59"}',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    season_name = excluded.season_name,
    config = excluded.config,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20261014190000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
