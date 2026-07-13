-- SQLite Companion Migration: 20260711183500_fix_active_nature_in_saves
-- Description: Corrects invalid nature 'active' to Showdown-compliant 'hasty' in local sqlite player saves.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  (
    SELECT json_group_array(
      json_set(
        team_item.value,
        '$.nature',
        coalesce(
          json_extract(
            '{"active":"hasty"}',
            '$.' || lower(json_extract(team_item.value, '$.nature'))
          ),
          json_extract(team_item.value, '$.nature')
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
        '$.nature',
        coalesce(
          json_extract(
            '{"active":"hasty"}',
            '$.' || lower(json_extract(box_item.value, '$.nature'))
          ),
          json_extract(box_item.value, '$.nature')
        )
      )
    )
    FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;
