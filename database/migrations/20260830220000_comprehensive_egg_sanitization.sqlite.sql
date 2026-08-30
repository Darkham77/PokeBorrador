-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: SANEAMIENTO Y REGENERACIÓN COMPLETA DE HUEVOS (SQLite)
-- Fecha: 2026-08-30
-- =====================================================

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  (
    SELECT json_group_array(
      json_set(
        json_set(
          json_set(
            json_set(
              json_set(
                json_set(
                  json_set(
                    json_set(
                      egg_item.value,
                      '$.id',
                      coalesce(
                        CASE
                          WHEN json_extract(egg_item.value, '$.id') LIKE 'egg_%' OR json_extract(egg_item.value, '$.id') = 'egg' OR json_extract(egg_item.value, '$.id') = 'test_egg_uid' THEN
                            coalesce(
                              nullif(json_extract(egg_item.value, '$.pokemonId'), ''),
                              nullif(json_extract(egg_item.value, '$.species'), ''),
                              'togepi'
                            )
                          ELSE nullif(json_extract(egg_item.value, '$.id'), '')
                        END,
                        nullif(json_extract(egg_item.value, '$.pokemonId'), ''),
                        nullif(json_extract(egg_item.value, '$.species'), ''),
                        'togepi'
                      )
                    ),
                    '$.nature',
                    coalesce(
                      json_extract(
                        '{"firme":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","osado":"bold","osada":"bold","audaz":"brave","sereno":"calm","serena":"calm","cauto":"careful","cauta":"careful","docil":"docile","dócil":"docile","amable":"gentle","fuerte":"hardy","activa":"hasty","activo":"hasty","agitada":"impish","agitado":"impish","alegre":"jolly","floja":"lax","flojo":"lax","hurana":"lonely","huraña":"lonely","hurano":"lonely","huraño":"lonely","afable":"mild","modesta":"modest","modesto":"modest","ingenua":"naive","ingenuo":"naive","picara":"naughty","pícara":"naughty","picaro":"naughty","pícaro":"naughty","mansa":"quiet","manso":"quiet","rara":"quirky","raro":"quirky","alocada":"rash","alocado":"rash","placida":"relaxed","plácida":"relaxed","placido":"relaxed","plácido":"relaxed","grosera":"sassy","grosero":"sassy","seria":"serious","serio":"serious","miedosa":"timid","miedoso":"timid","adamant":"adamant","bashful":"bashful","bold":"bold","brave":"brave","calm":"calm","careful":"careful","docile":"docile","gentle":"gentle","hardy":"hardy","hasty":"hasty","impish":"impish","jolly":"jolly","lax":"lax","lonely":"lonely","mild":"mild","modest":"modest","naive":"naive","naughty":"naughty","quiet":"quiet","quirky":"quirky","rash":"rash","relaxed":"relaxed","sassy":"sassy","serious":"serious","timid":"timid"}',
                        '$.' || lower(trim(coalesce(json_extract(egg_item.value, '$.nature'), 'serious')))
                      ),
                      'serious'
                    )
                  ),
                  '$.uid',
                  coalesce(nullif(json_extract(egg_item.value, '$.uid'), ''), 'egg-' || hex(randomblob(8)))
                ),
                '$.totalSteps',
                coalesce(
                  case when typeof(json_extract(egg_item.value, '$.totalSteps')) = 'integer' and json_extract(egg_item.value, '$.totalSteps') > 0 then json_extract(egg_item.value, '$.totalSteps') else null end,
                  case when typeof(json_extract(egg_item.value, '$.steps')) = 'integer' and json_extract(egg_item.value, '$.steps') > 0 then json_extract(egg_item.value, '$.steps') else null end,
                  1000
                )
              ),
              '$.steps',
              coalesce(
                case when typeof(json_extract(egg_item.value, '$.steps')) = 'integer' then json_extract(egg_item.value, '$.steps') else null end,
                1000
              )
            ),
            '$.ready',
            case when coalesce(json_extract(egg_item.value, '$.steps'), 1000) <= 0 then json('true') else json('false') end
          ),
          '$.isShiny',
          case when json_extract(egg_item.value, '$.isShiny') = 1 or json_extract(egg_item.value, '$.isShiny') = json('true') then json('true') else json('false') end
        ),
        '$.isNpc',
        case when json_extract(egg_item.value, '$.isNpc') = 1 or json_extract(egg_item.value, '$.isNpc') = json('true') then json('true') else json('false') end
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.eggs')) egg_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.eggs') IS NOT NULL;

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.daycareWarehouse',
  (
    SELECT json_group_array(
      json_set(
        json_set(
          json_set(
            json_set(
              json_set(
                dw_item.value,
                '$.species',
                coalesce(
                  CASE
                    WHEN json_extract(dw_item.value, '$.species') LIKE 'egg_%' OR json_extract(dw_item.value, '$.species') = 'egg' THEN 'togepi'
                    ELSE nullif(json_extract(dw_item.value, '$.species'), '')
                  END,
                  nullif(json_extract(dw_item.value, '$.id'), ''),
                  'togepi'
                )
              ),
              '$.name',
              'Huevo Pokémon'
            ),
            '$.level',
            1
          ),
          '$.isEgg',
          json('true')
        ),
        '$.nature',
        coalesce(
          json_extract(
            '{"firme":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","osado":"bold","osada":"bold","audaz":"brave","sereno":"calm","serena":"calm","cauto":"careful","cauta":"careful","docil":"docile","dócil":"docile","amable":"gentle","fuerte":"hardy","activa":"hasty","activo":"hasty","agitada":"impish","agitado":"impish","alegre":"jolly","floja":"lax","flojo":"lax","hurana":"lonely","huraña":"lonely","hurano":"lonely","huraño":"lonely","afable":"mild","modesta":"modest","modesto":"modest","ingenua":"naive","ingenuo":"naive","picara":"naughty","pícara":"naughty","picaro":"naughty","pícaro":"naughty","mansa":"quiet","manso":"quiet","rara":"quirky","raro":"quirky","alocada":"rash","alocado":"rash","placida":"relaxed","plácida":"relaxed","placido":"relaxed","plácido":"relaxed","grosera":"sassy","grosero":"sassy","seria":"serious","serio":"serious","miedosa":"timid","miedoso":"timid","adamant":"adamant","bashful":"bashful","bold":"bold","brave":"brave","calm":"calm","careful":"careful","docile":"docile","gentle":"gentle","hardy":"hardy","hasty":"hasty","impish":"impish","jolly":"jolly","lax":"lax","lonely":"lonely","mild":"mild","modest":"modest","naive":"naive","naughty":"naughty","quiet":"quiet","quirky":"quirky","rash":"rash","relaxed":"relaxed","sassy":"sassy","serious":"serious","timid":"timid"}',
            '$.' || lower(trim(coalesce(json_extract(dw_item.value, '$.nature'), 'serious')))
          ),
          'serious'
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.daycareWarehouse')) dw_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.daycareWarehouse') IS NOT NULL;

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260830220000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
