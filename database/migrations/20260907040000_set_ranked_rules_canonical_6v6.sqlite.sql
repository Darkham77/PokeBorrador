-- SQLite companion for 20260907040000_set_ranked_rules_canonical_6v6
-- Update ranked_rules_config to canonical 6v6 tournament format and sync active season rules.

INSERT INTO ranked_rules_config (id, season_name, config, updated_at)
VALUES (
    'current',
    'Frontera Kanto & Johto',
    '{"name":"Frontera Kanto & Johto","maxPokemon":6,"levelCap":50,"allowedTypes":[],"bannedPokemonIds":[]}',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    season_name = excluded.season_name,
    config = excluded.config,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (key, value)
VALUES ('db_version', '"20260907040000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
