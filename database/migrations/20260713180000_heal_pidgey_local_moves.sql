-- PostgreSQL Migration: 20260713180000_heal_pidgey_local_moves
-- Description: Specifically heals Pidgey's empty moves list in local player saves.

UPDATE game_saves
SET save_data = jsonb_set(
  save_data::jsonb,
  '{team}',
  coalesce(
    (
      SELECT jsonb_agg(
        CASE 
          WHEN (t.value->>'uid') = '3b70c27d-9a1d-4632-becb-d46db26e2398' 
               AND (t.value->'moves' IS NULL OR jsonb_array_length(t.value->'moves') = 0)
          THEN t.value || jsonb_build_object('moves', '[{"id":"tackle","name":"Tackle","pp":35,"maxPP":35,"type":"normal","acc":100,"cat":"physical"}]'::jsonb)
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
          WHEN (t.value->>'uid') = '3b70c27d-9a1d-4632-becb-d46db26e2398' 
               AND (t.value->'moves' IS NULL OR jsonb_array_length(t.value->'moves') = 0)
          THEN t.value || jsonb_build_object('moves', '[{"id":"tackle","name":"Tackle","pp":35,"maxPP":35,"type":"normal","acc":100,"cat":"physical"}]'::jsonb)
          ELSE t.value
        END
      )
      FROM jsonb_array_elements(save_data::jsonb->'box') t
    ),
    '[]'::jsonb
  )
)::json
WHERE save_data IS NOT NULL AND (save_data::jsonb->'box') IS NOT NULL;
