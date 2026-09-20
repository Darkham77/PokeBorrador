-- Migration: 20260920000000_normalize_castform_showdown_ids.sql
-- Description: Normalize Castform form species identifiers to pure alphanumeric Showdown format without hyphens.

-- 1. Game saves (team, box, daycareWarehouse, eggs, daycare, pokedex)
UPDATE public.game_saves
SET save_data = replace(
  replace(
    replace(save_data::text, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)::jsonb,
last_save_id = gen_random_uuid(),
updated_at = NOW()
WHERE save_data IS NOT NULL
  AND (
    save_data::text LIKE '%"castform-sunny"%'
    OR save_data::text LIKE '%"castform-rainy"%'
    OR save_data::text LIKE '%"castform-snowy"%'
  );

-- 2. Passive teams
UPDATE public.passive_teams
SET team_data = replace(
  replace(
    replace(team_data::text, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)::jsonb,
updated_at = NOW()
WHERE team_data IS NOT NULL
  AND (
    team_data::text LIKE '%"castform-sunny"%'
    OR team_data::text LIKE '%"castform-rainy"%'
    OR team_data::text LIKE '%"castform-snowy"%'
  );

-- 3. Market listings
UPDATE public.market_listings
SET data = replace(
  replace(
    replace(data::text, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)::jsonb,
updated_at = NOW()
WHERE data IS NOT NULL
  AND (
    data::text LIKE '%"castform-sunny"%'
    OR data::text LIKE '%"castform-rainy"%'
    OR data::text LIKE '%"castform-snowy"%'
  );

-- 4. Trade offers
UPDATE public.trade_offers
SET offer_pokemon = CASE
  WHEN offer_pokemon IS NOT NULL AND (
    offer_pokemon::text LIKE '%"castform-sunny"%'
    OR offer_pokemon::text LIKE '%"castform-rainy"%'
    OR offer_pokemon::text LIKE '%"castform-snowy"%'
  ) THEN replace(
    replace(
      replace(offer_pokemon::text, '"castform-sunny"', '"castformsunny"'),
      '"castform-rainy"', '"castformrainy"'
    ),
    '"castform-snowy"', '"castformsnowy"'
  )::jsonb
  ELSE offer_pokemon
END,
request_pokemon = CASE
  WHEN request_pokemon IS NOT NULL AND (
    request_pokemon::text LIKE '%"castform-sunny"%'
    OR request_pokemon::text LIKE '%"castform-rainy"%'
    OR request_pokemon::text LIKE '%"castform-snowy"%'
  ) THEN replace(
    replace(
      replace(request_pokemon::text, '"castform-sunny"', '"castformsunny"'),
      '"castform-rainy"', '"castformrainy"'
    ),
    '"castform-snowy"', '"castformsnowy"'
  )::jsonb
  ELSE request_pokemon
END,
updated_at = NOW()
WHERE (
  offer_pokemon::text LIKE '%"castform-sunny"%'
  OR offer_pokemon::text LIKE '%"castform-rainy"%'
  OR offer_pokemon::text LIKE '%"castform-snowy"%'
  OR request_pokemon::text LIKE '%"castform-sunny"%'
  OR request_pokemon::text LIKE '%"castform-rainy"%'
  OR request_pokemon::text LIKE '%"castform-snowy"%'
);

-- 5. Claim queue
UPDATE public.claim_queue
SET asset_data = replace(
  replace(
    replace(asset_data::text, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)::jsonb
WHERE asset_data IS NOT NULL
  AND (
    asset_data::text LIKE '%"castform-sunny"%'
    OR asset_data::text LIKE '%"castform-rainy"%'
    OR asset_data::text LIKE '%"castform-snowy"%'
  );

-- 6. War defenders
UPDATE public.war_defenders
SET pokemon_data = replace(
  replace(
    replace(pokemon_data::text, '"castform-sunny"', '"castformsunny"'),
    '"castform-rainy"', '"castformrainy"'
  ),
  '"castform-snowy"', '"castformsnowy"'
)::jsonb
WHERE pokemon_data IS NOT NULL
  AND (
    pokemon_data::text LIKE '%"castform-sunny"%'
    OR pokemon_data::text LIKE '%"castform-rainy"%'
    OR pokemon_data::text LIKE '%"castform-snowy"%'
  );

-- 7. Version bump
INSERT INTO public.system_config (key, value)
VALUES ('db_version', '20260920000000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
