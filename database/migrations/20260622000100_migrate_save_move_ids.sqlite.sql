-- SQLite Companion Migration: 20260622000100_migrate_save_move_ids
-- Description: Converts move IDs in local sqlite save_data to pure Showdown format without underscores.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  (
    SELECT json_group_array(
      json_set(
        team_item.value,
        '$.moves',
        (
          SELECT json_group_array(
            json_set(
              move_item.value,
              '$.id',
              replace(json_extract(move_item.value, '$.id'), '_', '')
            )
          )
          FROM json_each(json_extract(team_item.value, '$.moves')) move_item
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
        box_item.value,
        '$.moves',
        (
          SELECT json_group_array(
            json_set(
              move_item.value,
              '$.id',
              replace(json_extract(move_item.value, '$.id'), '_', '')
            )
          )
          FROM json_each(json_extract(box_item.value, '$.moves')) move_item
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;
