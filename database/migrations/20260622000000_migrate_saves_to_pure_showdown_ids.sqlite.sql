-- SQLite Companion Migration: 20260622000000_migrate_saves_to_pure_showdown_ids
-- Description: Converts species IDs in local sqlite save_data to pure Showdown format without underscores.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  (
    SELECT json_group_array(
      json_set(
        json_set(
          team_item.value,
          '$.id',
          coalesce(
            json_extract(
              '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
              '$.' || lower(json_extract(team_item.value, '$.id'))
            ),
            json_extract(team_item.value, '$.id')
          )
        ),
        '$.species',
        coalesce(
          json_extract(
            '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
            '$.' || lower(json_extract(team_item.value, '$.species'))
          ),
          json_extract(team_item.value, '$.species')
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.team')) team_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.team') IS NOT NULL;

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  (
    SELECT json_group_array(
      json_set(
        json_set(
          box_item.value,
          '$.id',
          coalesce(
            json_extract(
              '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
              '$.' || lower(json_extract(box_item.value, '$.id'))
            ),
            json_extract(box_item.value, '$.id')
          )
        ),
        '$.species',
        coalesce(
          json_extract(
            '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
            '$.' || lower(json_extract(box_item.value, '$.species'))
          ),
          json_extract(box_item.value, '$.species')
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;

-- Pokedex seen & caught cleanup
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.pokedex',
  (
    SELECT json_group_array(
      coalesce(
        json_extract(
          '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
          '$.' || lower(pk.value)
        ),
        pk.value
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.pokedex')) pk
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.pokedex') IS NOT NULL;

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.seenPokedex',
  (
    SELECT json_group_array(
      coalesce(
        json_extract(
          '{"nidoran_f":"nidoranf","nidoran_m":"nidoranm","mr_mime":"mrmime","ho_oh":"hooh","ho-oh":"hooh"}',
          '$.' || lower(pk.value)
        ),
        pk.value
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.seenPokedex')) pk
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.seenPokedex') IS NOT NULL;
