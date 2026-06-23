-- SQLite Companion Migration: 20260622000300_migrate_save_eggs_and_missions
-- Description: Converts species IDs in local sqlite save_data to pure Showdown format without underscores for eggs and daycare_missions.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  (
    SELECT json_group_array(
      json_set(
        json_set(
          json_set(
            egg_item.value,
            '$.id',
            coalesce(
              json_extract(
                '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
                '$.' || lower(json_extract(egg_item.value, '$.id'))
              ),
              json_extract(egg_item.value, '$.id')
            )
          ),
          '$.pokemonId',
          coalesce(
            json_extract(
              '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
              '$.' || lower(json_extract(egg_item.value, '$.pokemonId'))
            ),
            json_extract(egg_item.value, '$.pokemonId')
          )
        ),
        '$.uid',
        CASE 
          WHEN json_extract(egg_item.value, '$.uid') LIKE 'nidoran_f-%' THEN 'nidoranf-' || substr(json_extract(egg_item.value, '$.uid'), 11)
          WHEN json_extract(egg_item.value, '$.uid') LIKE 'nidoran_m-%' THEN 'nidoranm-' || substr(json_extract(egg_item.value, '$.uid'), 11)
          WHEN json_extract(egg_item.value, '$.uid') LIKE 'mr_mime-%' THEN 'mrmime-' || substr(json_extract(egg_item.value, '$.uid'), 9)
          WHEN json_extract(egg_item.value, '$.uid') LIKE 'ho_oh-%' THEN 'hooh-' || substr(json_extract(egg_item.value, '$.uid'), 7)
          WHEN json_extract(egg_item.value, '$.uid') LIKE 'ho-oh-%' THEN 'hooh-' || substr(json_extract(egg_item.value, '$.uid'), 7)
          ELSE json_extract(egg_item.value, '$.uid')
        END
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.eggs')) egg_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.eggs') IS NOT NULL;

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.daycare_missions',
  (
    SELECT json_group_array(
      json_set(
        mission_item.value,
        '$.targetId',
        coalesce(
          json_extract(
            '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
            '$.' || lower(json_extract(mission_item.value, '$.targetId'))
          ),
          json_extract(mission_item.value, '$.targetId')
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.daycare_missions')) mission_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.daycare_missions') IS NOT NULL;
