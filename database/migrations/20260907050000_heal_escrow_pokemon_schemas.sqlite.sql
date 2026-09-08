-- SQLite Companion Migration: 20260907050000_heal_escrow_pokemon_schemas
-- Description: Normalizes species, status, and natures across escrow and in-transit Pokémon tables (claim_queue, market_listings, trade_offers).

-- 1. claim_queue Pokémon normalization
UPDATE claim_queue
SET asset_data = json_set(
  asset_data,
  '$.data.species',
  coalesce(
    json_extract(asset_data, '$.data.species'),
    json_extract(asset_data, '$.data.id')
  ),
  '$.data.status',
  CASE 
    WHEN lower(coalesce(json_extract(asset_data, '$.data.status'), '')) IN ('sleep', 'slp') THEN 'slp'
    WHEN lower(coalesce(json_extract(asset_data, '$.data.status'), '')) IN ('poison', 'psn') THEN 'psn'
    WHEN lower(coalesce(json_extract(asset_data, '$.data.status'), '')) IN ('burn', 'brn') THEN 'brn'
    WHEN lower(coalesce(json_extract(asset_data, '$.data.status'), '')) IN ('paralysis', 'par') THEN 'par'
    WHEN lower(coalesce(json_extract(asset_data, '$.data.status'), '')) IN ('freeze', 'frz') THEN 'frz'
    WHEN lower(coalesce(json_extract(asset_data, '$.data.status'), '')) IN ('toxic', 'tox') THEN 'tox'
    ELSE ''
  END,
  '$.data.nature',
  coalesce(
    json_extract(
      '{"serio":"serious","seria":"serious","serious":"serious","firme":"adamant","adamant":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","bashful":"bashful","osado":"bold","osada":"bold","bold":"bold","audaz":"brave","brave":"brave","sereno":"calm","serena":"calm","calm":"calm","cauto":"careful","cauta":"careful","careful":"careful","docil":"docile","dócil":"docile","docile":"docile","amable":"gentle","gentle":"gentle","fuerte":"hardy","hardy":"hardy","activa":"hasty","activo":"hasty","active":"hasty","hasty":"hasty","agitada":"impish","agitado":"impish","impish":"impish","alegre":"jolly","jovial":"jolly","jolly":"jolly","floja":"lax","flojo":"lax","lax":"lax","hurana":"lonely","hurano":"lonely","huraña":"lonely","huraño":"lonely","lonely":"lonely","afable":"mild","moderada":"mild","moderado":"mild","mild":"mild","modesta":"modest","modesto":"modest","modest":"modest","ingenua":"naive","ingenuo":"naive","naive":"naive","picara":"naughty","picaro":"naughty","pícara":"naughty","pícaro":"naughty","naughty":"naughty","mansa":"quiet","manso":"quiet","tranquila":"quiet","tranquilo":"quiet","tasa":"quiet","quiet":"quiet","rara":"quirky","raro":"quirky","quirky":"quirky","alocada":"rash","alocado":"rash","rash":"rash","placida":"relaxed","placido":"relaxed","plácida":"relaxed","plácido":"relaxed","relaxed":"relaxed","grosera":"sassy","grosero":"sassy","sassy":"sassy","miedosa":"timid","miedoso":"timid","timid":"timid"}',
      '$.' || lower(coalesce(json_extract(asset_data, '$.data.nature'), 'hardy'))
    ),
    lower(coalesce(json_extract(asset_data, '$.data.nature'), 'hardy'))
  )
)
WHERE asset_data IS NOT NULL AND json_extract(asset_data, '$.type') = 'pokemon';

-- 2. market_listings Pokémon normalization
UPDATE market_listings
SET data = json_set(
  data,
  '$.species',
  coalesce(
    json_extract(data, '$.species'),
    json_extract(data, '$.id')
  ),
  '$.status',
  CASE 
    WHEN lower(coalesce(json_extract(data, '$.status'), '')) IN ('sleep', 'slp') THEN 'slp'
    WHEN lower(coalesce(json_extract(data, '$.status'), '')) IN ('poison', 'psn') THEN 'psn'
    WHEN lower(coalesce(json_extract(data, '$.status'), '')) IN ('burn', 'brn') THEN 'brn'
    WHEN lower(coalesce(json_extract(data, '$.status'), '')) IN ('paralysis', 'par') THEN 'par'
    WHEN lower(coalesce(json_extract(data, '$.status'), '')) IN ('freeze', 'frz') THEN 'frz'
    WHEN lower(coalesce(json_extract(data, '$.status'), '')) IN ('toxic', 'tox') THEN 'tox'
    ELSE ''
  END,
  '$.nature',
  coalesce(
    json_extract(
      '{"serio":"serious","seria":"serious","serious":"serious","firme":"adamant","adamant":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","bashful":"bashful","osado":"bold","osada":"bold","bold":"bold","audaz":"brave","brave":"brave","sereno":"calm","serena":"calm","calm":"calm","cauto":"careful","cauta":"careful","careful":"careful","docil":"docile","dócil":"docile","docile":"docile","amable":"gentle","gentle":"gentle","fuerte":"hardy","hardy":"hardy","activa":"hasty","activo":"hasty","active":"hasty","hasty":"hasty","agitada":"impish","agitado":"impish","impish":"impish","alegre":"jolly","jovial":"jolly","jolly":"jolly","floja":"lax","flojo":"lax","lax":"lax","hurana":"lonely","hurano":"lonely","huraña":"lonely","huraño":"lonely","lonely":"lonely","afable":"mild","moderada":"mild","moderado":"mild","mild":"mild","modesta":"modest","modesto":"modest","modest":"modest","ingenua":"naive","ingenuo":"naive","naive":"naive","picara":"naughty","picaro":"naughty","pícara":"naughty","pícaro":"naughty","naughty":"naughty","mansa":"quiet","manso":"quiet","tranquila":"quiet","tranquilo":"quiet","tasa":"quiet","quiet":"quiet","rara":"quirky","raro":"quirky","quirky":"quirky","alocada":"rash","alocado":"rash","rash":"rash","placida":"relaxed","placido":"relaxed","plácida":"relaxed","plácido":"relaxed","relaxed":"relaxed","grosera":"sassy","grosero":"sassy","sassy":"sassy","miedosa":"timid","miedoso":"timid","timid":"timid"}',
      '$.' || lower(coalesce(json_extract(data, '$.nature'), 'hardy'))
    ),
    lower(coalesce(json_extract(data, '$.nature'), 'hardy'))
  )
)
WHERE listing_type = 'pokemon' AND data IS NOT NULL;

-- 3. trade_offers offer_pokemon normalization
UPDATE trade_offers
SET offer_pokemon = json_set(
  offer_pokemon,
  '$.species',
  coalesce(
    json_extract(offer_pokemon, '$.species'),
    json_extract(offer_pokemon, '$.id')
  ),
  '$.status',
  CASE 
    WHEN lower(coalesce(json_extract(offer_pokemon, '$.status'), '')) IN ('sleep', 'slp') THEN 'slp'
    WHEN lower(coalesce(json_extract(offer_pokemon, '$.status'), '')) IN ('poison', 'psn') THEN 'psn'
    WHEN lower(coalesce(json_extract(offer_pokemon, '$.status'), '')) IN ('burn', 'brn') THEN 'brn'
    WHEN lower(coalesce(json_extract(offer_pokemon, '$.status'), '')) IN ('paralysis', 'par') THEN 'par'
    WHEN lower(coalesce(json_extract(offer_pokemon, '$.status'), '')) IN ('freeze', 'frz') THEN 'frz'
    WHEN lower(coalesce(json_extract(offer_pokemon, '$.status'), '')) IN ('toxic', 'tox') THEN 'tox'
    ELSE ''
  END,
  '$.nature',
  coalesce(
    json_extract(
      '{"serio":"serious","seria":"serious","serious":"serious","firme":"adamant","adamant":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","bashful":"bashful","osado":"bold","osada":"bold","bold":"bold","audaz":"brave","brave":"brave","sereno":"calm","serena":"calm","calm":"calm","cauto":"careful","cauta":"careful","careful":"careful","docil":"docile","dócil":"docile","docile":"docile","amable":"gentle","gentle":"gentle","fuerte":"hardy","hardy":"hardy","activa":"hasty","activo":"hasty","active":"hasty","hasty":"hasty","agitada":"impish","agitado":"impish","impish":"impish","alegre":"jolly","jovial":"jolly","jolly":"jolly","floja":"lax","flojo":"lax","lax":"lax","hurana":"lonely","hurano":"lonely","huraña":"lonely","huraño":"lonely","lonely":"lonely","afable":"mild","moderada":"mild","moderado":"mild","mild":"mild","modesta":"modest","modesto":"modest","modest":"modest","ingenua":"naive","ingenuo":"naive","naive":"naive","picara":"naughty","picaro":"naughty","pícara":"naughty","pícaro":"naughty","naughty":"naughty","mansa":"quiet","manso":"quiet","tranquila":"quiet","tranquilo":"quiet","tasa":"quiet","quiet":"quiet","rara":"quirky","raro":"quirky","quirky":"quirky","alocada":"rash","alocado":"rash","rash":"rash","placida":"relaxed","placido":"relaxed","plácida":"relaxed","plácido":"relaxed","relaxed":"relaxed","grosera":"sassy","grosero":"sassy","sassy":"sassy","miedosa":"timid","miedoso":"timid","timid":"timid"}',
      '$.' || lower(coalesce(json_extract(offer_pokemon, '$.nature'), 'hardy'))
    ),
    lower(coalesce(json_extract(offer_pokemon, '$.nature'), 'hardy'))
  )
)
WHERE offer_pokemon IS NOT NULL AND json_extract(offer_pokemon, '$.id') IS NOT NULL;

-- 4. trade_offers request_pokemon normalization
UPDATE trade_offers
SET request_pokemon = json_set(
  request_pokemon,
  '$.species',
  coalesce(
    json_extract(request_pokemon, '$.species'),
    json_extract(request_pokemon, '$.id')
  ),
  '$.status',
  CASE 
    WHEN lower(coalesce(json_extract(request_pokemon, '$.status'), '')) IN ('sleep', 'slp') THEN 'slp'
    WHEN lower(coalesce(json_extract(request_pokemon, '$.status'), '')) IN ('poison', 'psn') THEN 'psn'
    WHEN lower(coalesce(json_extract(request_pokemon, '$.status'), '')) IN ('burn', 'brn') THEN 'brn'
    WHEN lower(coalesce(json_extract(request_pokemon, '$.status'), '')) IN ('paralysis', 'par') THEN 'par'
    WHEN lower(coalesce(json_extract(request_pokemon, '$.status'), '')) IN ('freeze', 'frz') THEN 'frz'
    WHEN lower(coalesce(json_extract(request_pokemon, '$.status'), '')) IN ('toxic', 'tox') THEN 'tox'
    ELSE ''
  END,
  '$.nature',
  coalesce(
    json_extract(
      '{"serio":"serious","seria":"serious","serious":"serious","firme":"adamant","adamant":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","bashful":"bashful","osado":"bold","osada":"bold","bold":"bold","audaz":"brave","brave":"brave","sereno":"calm","serena":"calm","calm":"calm","cauto":"careful","cauta":"careful","careful":"careful","docil":"docile","dócil":"docile","docile":"docile","amable":"gentle","gentle":"gentle","fuerte":"hardy","hardy":"hardy","activa":"hasty","activo":"hasty","active":"hasty","hasty":"hasty","agitada":"impish","agitado":"impish","impish":"impish","alegre":"jolly","jovial":"jolly","jolly":"jolly","floja":"lax","flojo":"lax","lax":"lax","hurana":"lonely","hurano":"lonely","huraña":"lonely","huraño":"lonely","lonely":"lonely","afable":"mild","moderada":"mild","moderado":"mild","mild":"mild","modesta":"modest","modesto":"modest","modest":"modest","ingenua":"naive","ingenuo":"naive","naive":"naive","picara":"naughty","picaro":"naughty","pícara":"naughty","pícaro":"naughty","naughty":"naughty","mansa":"quiet","manso":"quiet","tranquila":"quiet","tranquilo":"quiet","tasa":"quiet","quiet":"quiet","rara":"quirky","raro":"quirky","quirky":"quirky","alocada":"rash","alocado":"rash","rash":"rash","placida":"relaxed","placido":"relaxed","plácida":"relaxed","plácido":"relaxed","relaxed":"relaxed","grosera":"sassy","grosero":"sassy","sassy":"sassy","miedosa":"timid","miedoso":"timid","timid":"timid"}',
      '$.' || lower(coalesce(json_extract(request_pokemon, '$.nature'), 'hardy'))
    ),
    lower(coalesce(json_extract(request_pokemon, '$.nature'), 'hardy'))
  )
)
WHERE request_pokemon IS NOT NULL AND json_extract(request_pokemon, '$.id') IS NOT NULL;

-- 5. Update system_config db_version
INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260907050000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
