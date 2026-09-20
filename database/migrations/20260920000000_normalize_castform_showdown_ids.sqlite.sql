-- SQLite Companion Migration: 20260920000000_normalize_castform_showdown_ids
-- Description: Normalize Castform form species identifiers to pure alphanumeric Showdown format without hyphens in SQLite.

-- 1. Game saves
UPDATE game_saves
SET save_data = replace(
  replace(
    replace(save_data, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)
WHERE save_data IS NOT NULL
  AND (
    save_data LIKE '%"castform-sunny"%'
    OR save_data LIKE '%"castform-rainy"%'
    OR save_data LIKE '%"castform-snowy"%'
  );

-- 2. Passive teams
UPDATE passive_teams
SET team_data = replace(
  replace(
    replace(team_data, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)
WHERE team_data IS NOT NULL
  AND (
    team_data LIKE '%"castform-sunny"%'
    OR team_data LIKE '%"castform-rainy"%'
    OR team_data LIKE '%"castform-snowy"%'
  );

-- 3. Version bump
INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260920000000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
