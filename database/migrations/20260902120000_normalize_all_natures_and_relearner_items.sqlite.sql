-- SQLite Companion Migration: 20260902120000_normalize_all_natures_and_relearner_items
-- Description: Converts nature IDs in local sqlite save_data (team, box, eggs) to pure Showdown format and maps move_relearner -> moverelearner.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  (
    SELECT json_group_array(
      CASE
        WHEN json_extract(egg_item.value, '$.nature') IS NULL OR json_extract(egg_item.value, '$.nature') = '' THEN
          json_set(egg_item.value, '$.nature', 'serious')
        ELSE
          json_set(
            egg_item.value,
            '$.nature',
            coalesce(
              json_extract(
                '{"serio":"serious","seria":"serious","serious":"serious","firme":"adamant","adamant":"adamant","timido":"bashful","timida":"bashful","tímido":"bashful","tímida":"bashful","bashful":"bashful","osado":"bold","osada":"bold","bold":"bold","audaz":"brave","brave":"brave","sereno":"calm","serena":"calm","calm":"calm","cauto":"careful","cauta":"careful","careful":"careful","docil":"docile","dócil":"docile","docile":"docile","amable":"gentle","gentle":"gentle","fuerte":"hardy","hardy":"hardy","activa":"hasty","activo":"hasty","active":"hasty","hasty":"hasty","agitada":"impish","agitado":"impish","impish":"impish","alegre":"jolly","jovial":"jolly","jolly":"jolly","floja":"lax","flojo":"lax","lax":"lax","hurana":"lonely","hurano":"lonely","huraña":"lonely","huraño":"lonely","lonely":"lonely","afable":"mild","moderada":"mild","moderado":"mild","mild":"mild","modesta":"modest","modesto":"modest","modest":"modest","ingenua":"naive","ingenuo":"naive","naive":"naive","picara":"naughty","picaro":"naughty","pícara":"naughty","pícaro":"naughty","naughty":"naughty","mansa":"quiet","manso":"quiet","tranquila":"quiet","tranquilo":"quiet","tasa":"quiet","quiet":"quiet","rara":"quirky","raro":"quirky","quirky":"quirky","alocada":"rash","alocado":"rash","rash":"rash","placida":"relaxed","placido":"relaxed","plácida":"relaxed","plácido":"relaxed","relaxed":"relaxed","grosera":"sassy","grosero":"sassy","sassy":"sassy","miedosa":"timid","miedoso":"timid","timid":"timid"}',
                '$.' || lower(json_extract(egg_item.value, '$.nature'))
              ),
              lower(json_extract(egg_item.value, '$.nature'))
            )
          )
      END
    )
    FROM json_each(json_extract(game_saves.save_data, '$.eggs')) egg_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.eggs') IS NOT NULL;

INSERT INTO system_config (key, value, updated_at)
VALUES ('db_version', '20260902120000', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
