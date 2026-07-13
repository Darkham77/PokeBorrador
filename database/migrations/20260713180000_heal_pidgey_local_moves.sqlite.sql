-- SQLite Companion Migration: 20260713180000_heal_pidgey_local_moves
-- Description: Specifically heals Pidgey's empty moves list in local browser saves.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  (
    SELECT json_group_array(
      CASE 
        WHEN json_extract(team_item.value, '$.uid') = '3b70c27d-9a1d-4632-becb-d46db26e2398' 
             AND (json_extract(team_item.value, '$.moves') IS NULL OR json_array_length(json_extract(team_item.value, '$.moves')) = 0)
        THEN json_set(team_item.value, '$.moves', json('[{"id":"tackle","name":"Tackle","pp":35,"maxPP":35,"type":"normal","acc":100,"cat":"physical"}]'))
        ELSE team_item.value
      END
    )
    FROM json_each(json_extract(game_saves.save_data, '$.team')) team_item
  )
)
WHERE save_data IS NOT NULL 
  AND json_extract(save_data, '$.team') IS NOT NULL;

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  (
    SELECT json_group_array(
      CASE 
        WHEN json_extract(box_item.value, '$.uid') = '3b70c27d-9a1d-4632-becb-d46db26e2398' 
             AND (json_extract(box_item.value, '$.moves') IS NULL OR json_array_length(json_extract(box_item.value, '$.moves')) = 0)
        THEN json_set(box_item.value, '$.moves', json('[{"id":"tackle","name":"Tackle","pp":35,"maxPP":35,"type":"normal","acc":100,"cat":"physical"}]'))
        ELSE box_item.value
      END
    )
    FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
  )
)
WHERE save_data IS NOT NULL 
  AND json_extract(save_data, '$.box') IS NOT NULL;
