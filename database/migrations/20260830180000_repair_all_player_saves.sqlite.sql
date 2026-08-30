-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: EXP_NEEDED Y HUEVOS IDS (SQLite)
-- Fecha: 2026-08-30
-- Descripción: Corrige valores null o no numéricos en expNeeded (Pokémon nivel 100)
--              y convierte IDs numéricos de huevos en strings para cumplir con saveDataSchema.
-- =====================================================

-- 1. Normalizar Pokémon en Team
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  json(
    (
      SELECT json_group_array(
        json_set(
          team_item.value,
          '$.expNeeded', CASE 
            WHEN CAST(coalesce(json_extract(team_item.value, '$.level'), 1) AS INTEGER) >= 100 THEN 0
            WHEN json_extract(team_item.value, '$.expNeeded') IS NULL THEN 100
            ELSE json_extract(team_item.value, '$.expNeeded')
          END
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.team')) team_item
      WHERE team_item.value IS NOT NULL AND json_type(team_item.value) = 'object'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.team') IS NOT NULL;

-- 2. Normalizar Pokémon en Box
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  json(
    (
      SELECT json_group_array(
        CASE 
          WHEN box_item.value IS NULL OR json_type(box_item.value) = 'null' THEN NULL
          ELSE json_set(
            box_item.value,
            '$.expNeeded', CASE 
              WHEN CAST(coalesce(json_extract(box_item.value, '$.level'), 1) AS INTEGER) >= 100 THEN 0
              WHEN json_extract(box_item.value, '$.expNeeded') IS NULL THEN 100
              ELSE json_extract(box_item.value, '$.expNeeded')
            END
          )
        END
      )
      FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;

-- 3. Normalizar Huevos (eggs)
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
          'egg_' || lower(hex(randomblob(4)))
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.eggs')) egg_item
      WHERE egg_item.value IS NOT NULL AND json_type(egg_item.value) = 'object'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.eggs') IS NOT NULL;

-- 4. Normalizar Inventario (cantidades negativas a 0)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.inventory',
  json(
    (
      SELECT json_group_object(
        inv.key,
        CASE 
          WHEN CAST(inv.value AS INTEGER) < 0 THEN 0
          ELSE CAST(inv.value AS INTEGER)
        END
      )
      FROM json_each(json_extract(game_saves.save_data, '$.inventory')) inv
      WHERE inv.value IS NOT NULL
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.inventory') IS NOT NULL;

-- 5. Actualizar versión del sistema y rotar last_save_id
INSERT INTO system_config (key, value) VALUES ('db_version', json('20260830180000'))
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

UPDATE game_saves SET last_save_id = lower(hex(randomblob(16)));
