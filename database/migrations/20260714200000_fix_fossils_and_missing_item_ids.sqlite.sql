-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: CORRECCIÓN DE FÓSILES Y OTROS ÍTEMS CON GUION BAJO (SQLite)
-- Fecha: 2026-07-14
-- Descripción: Corrección de IDs de fósiles y otros ítems con guisión bajo restantes en los inventarios,
--              equipos y cajas de las partidas guardadas locales.
-- =====================================================

-- 1. Actualizar inventario (mochila)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.inventory',
  json(
    (
      SELECT json_group_object(clean_key, sum_value)
      FROM (
        SELECT 
          coalesce(
            json_extract(
              '{"old_amber":"oldamber","helix_fossil":"helixfossil","dome_fossil":"domefossil","brush_super":"brushsuper","brush_good":"brushgood","spell_tag":"spelltag","light_ball":"lightball","thick_club":"thickclub"}',
              '$.' || lower(inv.key)
            ),
            lower(inv.key)
          ) AS clean_key,
          SUM(CAST(inv.value AS INTEGER)) AS sum_value
        FROM json_each(json_extract(game_saves.save_data, '$.inventory')) inv
        GROUP BY clean_key
      )
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.inventory') IS NOT NULL;

-- 2. Actualizar objetos equipados en equipo (team)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  json(
    (
      SELECT json_group_array(
        json_set(
          team_item.value,
          '$.heldItem',
          coalesce(
            json_extract(
              '{"old_amber":"oldamber","helix_fossil":"helixfossil","dome_fossil":"domefossil","brush_super":"brushsuper","brush_good":"brushgood","spell_tag":"spelltag","light_ball":"lightball","thick_club":"thickclub"}',
              '$.' || lower(json_extract(team_item.value, '$.heldItem'))
            ),
            json_extract(team_item.value, '$.heldItem')
          )
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.team')) team_item
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.team') IS NOT NULL;

-- 3. Actualizar objetos equipados en caja (box)
UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.box',
  json(
    (
      SELECT json_group_array(
        json_set(
          box_item.value,
          '$.heldItem',
          coalesce(
            json_extract(
              '{"old_amber":"oldamber","helix_fossil":"helixfossil","dome_fossil":"domefossil","brush_super":"brushsuper","brush_good":"brushgood","spell_tag":"spelltag","light_ball":"lightball","thick_club":"thickclub"}',
              '$.' || lower(json_extract(box_item.value, '$.heldItem'))
            ),
            json_extract(box_item.value, '$.heldItem')
          )
        )
      )
      FROM json_each(json_extract(game_saves.save_data, '$.box')) box_item
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.box') IS NOT NULL;
