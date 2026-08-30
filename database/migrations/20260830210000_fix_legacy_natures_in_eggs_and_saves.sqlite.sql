-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: NORMALIZACIÓN DE NATURALEZAS EN HUEVOS Y SAVES (SQLite)
-- Fecha: 2026-08-30
-- =====================================================

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  (
    SELECT json_group_array(
      CASE
        WHEN json_extract(egg_item.value, '$.nature') IS NOT NULL THEN
          json_set(
            egg_item.value,
            '$.nature',
            coalesce(
              json_extract(
                '{"firme":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","osado":"bold","osada":"bold","audaz":"brave","sereno":"calm","serena":"calm","cauto":"careful","cauta":"careful","docil":"docile","dócil":"docile","amable":"gentle","fuerte":"hardy","activa":"hasty","activo":"hasty","agitada":"impish","agitado":"impish","alegre":"jolly","floja":"lax","flojo":"lax","hurana":"lonely","huraña":"lonely","hurano":"lonely","huraño":"lonely","afable":"mild","modesta":"modest","modesto":"modest","ingenua":"naive","ingenuo":"naive","picara":"naughty","pícara":"naughty","picaro":"naughty","pícaro":"naughty","mansa":"quiet","manso":"quiet","rara":"quirky","raro":"quirky","alocada":"rash","alocado":"rash","placida":"relaxed","plácida":"relaxed","placido":"relaxed","plácido":"relaxed","grosera":"sassy","grosero":"sassy","seria":"serious","serio":"serious","miedosa":"timid","miedoso":"timid"}',
                '$.' || lower(trim(json_extract(egg_item.value, '$.nature')))
              ),
              json_extract(egg_item.value, '$.nature')
            )
          )
        ELSE egg_item.value
      END
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
      CASE
        WHEN json_extract(dw_item.value, '$.nature') IS NOT NULL THEN
          json_set(
            dw_item.value,
            '$.nature',
            coalesce(
              json_extract(
                '{"firme":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","osado":"bold","osada":"bold","audaz":"brave","sereno":"calm","serena":"calm","cauto":"careful","cauta":"careful","docil":"docile","dócil":"docile","amable":"gentle","fuerte":"hardy","activa":"hasty","activo":"hasty","agitada":"impish","agitado":"impish","alegre":"jolly","floja":"lax","flojo":"lax","hurana":"lonely","huraña":"lonely","hurano":"lonely","huraño":"lonely","afable":"mild","modesta":"modest","modesto":"modest","ingenua":"naive","ingenuo":"naive","picara":"naughty","pícara":"naughty","picaro":"naughty","pícaro":"naughty","mansa":"quiet","manso":"quiet","rara":"quirky","raro":"quirky","alocada":"rash","alocado":"rash","placida":"relaxed","plácida":"relaxed","placido":"relaxed","plácido":"relaxed","grosera":"sassy","grosero":"sassy","seria":"serious","serio":"serious","miedosa":"timid","miedoso":"timid"}',
                '$.' || lower(trim(json_extract(dw_item.value, '$.nature')))
              ),
              json_extract(dw_item.value, '$.nature')
            )
          )
        ELSE dw_item.value
      END
    )
    FROM json_each(json_extract(game_saves.save_data, '$.daycareWarehouse')) dw_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.daycareWarehouse') IS NOT NULL;

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260830210000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
