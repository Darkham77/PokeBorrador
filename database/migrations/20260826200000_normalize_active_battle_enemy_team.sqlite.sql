-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: NORMALIZACIÓN DE ENEMYTEAM EN COMBATES ACTIVOS (SQLite)
-- Fecha: 2026-08-26
-- Descripción: Normaliza y asigna estáticamente 'species' y valores canónicos a todos los Pokémon
--              en activeBattle.enemyTeam de game_saves para garantizar paridad SSoT 1:1 con pokemonSchema.
-- =====================================================

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.activeBattle.enemyTeam',
  json(
    (
      SELECT json_group_array(
        json_set(
          enemy_item.value,
          '$.species', coalesce(json_extract(enemy_item.value, '$.species'), json_extract(enemy_item.value, '$.id')),
          '$.isShiny', CASE WHEN coalesce(json_extract(enemy_item.value, '$.isShiny'), 0) IN (1, 'true', true) THEN json('true') ELSE json('false') END,
          '$.expNeeded', coalesce(json_extract(enemy_item.value, '$.expNeeded'), 100),
          '$.status', CASE 
            WHEN lower(coalesce(json_extract(enemy_item.value, '$.status'), '')) IN ('sleep', 'slp') THEN 'slp'
            WHEN lower(coalesce(json_extract(enemy_item.value, '$.status'), '')) IN ('poison', 'psn') THEN 'psn'
            WHEN lower(coalesce(json_extract(enemy_item.value, '$.status'), '')) IN ('burn', 'brn') THEN 'brn'
            WHEN lower(coalesce(json_extract(enemy_item.value, '$.status'), '')) IN ('paralysis', 'par') THEN 'par'
            WHEN lower(coalesce(json_extract(enemy_item.value, '$.status'), '')) IN ('freeze', 'frz') THEN 'frz'
            WHEN lower(coalesce(json_extract(enemy_item.value, '$.status'), '')) IN ('tox', 'toxic') THEN 'tox'
            ELSE ''
          END,
          '$.friendship', coalesce(json_extract(enemy_item.value, '$.friendship'), 70)
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.activeBattle.enemyTeam')) enemy_item
      WHERE enemy_item.value IS NOT NULL AND json_type(enemy_item.value) = 'object'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.activeBattle.enemyTeam') IS NOT NULL;
