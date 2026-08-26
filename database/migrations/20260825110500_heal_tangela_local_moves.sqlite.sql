-- SQLite Companion Migration: 20260825110500_heal_tangela_local_moves
-- Description: Specifically heals Tangela's illegal tickle move at level 1 in player saves.

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  (
    SELECT json_group_array(
      CASE 
        WHEN json_extract(team_item.value, '$.uid') = '22a8b43f-2791-4999-bc83-1a8405d0b22b'
        THEN json_set(team_item.value, '$.moves', json('[{"id":"absorb","name":"Absorb","pp":25,"maxPP":25,"type":"grass","acc":100,"cat":"special"},{"id":"ingrain","name":"Ingrain","pp":20,"maxPP":20,"type":"grass","acc":100,"cat":"status"}]'))
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
        WHEN json_extract(box_item.value, '$.uid') = '22a8b43f-2791-4999-bc83-1a8405d0b22b'
        THEN json_set(box_item.value, '$.moves', json('[{"id":"absorb","name":"Absorb","pp":25,"maxPP":25,"type":"grass","acc":100,"cat":"special"},{"id":"ingrain","name":"Ingrain","pp":20,"maxPP":20,"type":"grass","acc":100,"cat":"status"}]'))
        ELSE box_item.value
      END
    )
    FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
  )
)
WHERE save_data IS NOT NULL 
  AND json_extract(save_data, '$.box') IS NOT NULL;
