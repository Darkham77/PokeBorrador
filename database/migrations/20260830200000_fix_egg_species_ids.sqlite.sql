-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: CORRECCIÓN DE ESPECIES EN HUEVOS (SQLite)
-- Fecha: 2026-08-30
-- Descripción: Repara los IDs de especies en "eggs" que fueron erróneamente prefijados con 'egg_'
--              o quedaron como identificadores opacos, restaurando el PokemonSpeciesId canónico.
-- =====================================================

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.eggs',
  json(
    (
      SELECT json_group_array(
        json_set(
          egg_item.value,
          '$.id',
          CASE
            WHEN json_extract(egg_item.value, '$.pokemonId') IS NOT NULL AND json_extract(egg_item.value, '$.pokemonId') != '' AND json_extract(egg_item.value, '$.pokemonId') NOT LIKE 'egg_%' THEN json_extract(egg_item.value, '$.pokemonId')
            WHEN json_extract(egg_item.value, '$.species') IS NOT NULL AND json_extract(egg_item.value, '$.species') != '' AND json_extract(egg_item.value, '$.species') NOT LIKE 'egg_%' THEN json_extract(egg_item.value, '$.species')
            WHEN json_extract(egg_item.value, '$.id') IS NOT NULL AND json_type(egg_item.value, '$.id') = 'text' AND json_extract(egg_item.value, '$.id') NOT LIKE 'egg_%' AND json_extract(egg_item.value, '$.id') != '' THEN json_extract(egg_item.value, '$.id')
            WHEN instr(coalesce(json_extract(egg_item.value, '$.uid'), ''), '-') > 1 AND substr(json_extract(egg_item.value, '$.uid'), 1, instr(json_extract(egg_item.value, '$.uid'), '-') - 1) NOT LIKE 'egg%' THEN substr(json_extract(egg_item.value, '$.uid'), 1, instr(json_extract(egg_item.value, '$.uid'), '-') - 1)
            ELSE 'togepi'
          END
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.eggs')) egg_item
      WHERE egg_item.value IS NOT NULL AND json_type(egg_item.value) = 'object'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.eggs') IS NOT NULL;

INSERT INTO system_config (key, value) VALUES ('db_version', json('20260830200000'))
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

UPDATE game_saves SET last_save_id = lower(hex(randomblob(16)));
