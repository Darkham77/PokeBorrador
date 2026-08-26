-- PostgreSQL Migration: 20260825110500_heal_tangela_local_moves
-- Description: Specifically heals Tangela's illegal tickle move at level 1 in player saves.

UPDATE game_saves
SET save_data = jsonb_set(
  save_data::jsonb,
  '{team}',
  coalesce(
    (
      SELECT jsonb_agg(
        CASE 
          WHEN (t.value->>'uid') = '22a8b43f-2791-4999-bc83-1a8405d0b22b'
          THEN t.value || jsonb_build_object('moves', '[{"id":"absorb","name":"Absorb","pp":25,"maxPP":25,"type":"grass","acc":100,"cat":"special"},{"id":"ingrain","name":"Ingrain","pp":20,"maxPP":20,"type":"grass","acc":100,"cat":"status"}]'::jsonb)
          ELSE t.value
        END
      )
      FROM jsonb_array_elements(save_data::jsonb->'team') t
    ),
    '[]'::jsonb
  )
)::json
WHERE save_data IS NOT NULL AND (save_data::jsonb->'team') IS NOT NULL;

UPDATE game_saves
SET save_data = jsonb_set(
  save_data::jsonb,
  '{box}',
  coalesce(
    (
      SELECT jsonb_agg(
        CASE 
          WHEN (t.value->>'uid') = '22a8b43f-2791-4999-bc83-1a8405d0b22b'
          THEN t.value || jsonb_build_object('moves', '[{"id":"absorb","name":"Absorb","pp":25,"maxPP":25,"type":"grass","acc":100,"cat":"special"},{"id":"ingrain","name":"Ingrain","pp":20,"maxPP":20,"type":"grass","acc":100,"cat":"status"}]'::jsonb)
          ELSE t.value
        END
      )
      FROM jsonb_array_elements(save_data::jsonb->'box') t
    ),
    '[]'::jsonb
  )
)::json
WHERE save_data IS NOT NULL AND (save_data::jsonb->'box') IS NOT NULL;
