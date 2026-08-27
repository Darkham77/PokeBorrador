-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE SAVES: ELIMINACIÓN DE SIZE LEGACY (SQLite)
-- Fecha: 2026-08-27
-- Descripción: Elimina la propiedad legacy 'size' de todos los Pokémon guardados
--              en team y box de game_saves, así como en competition_entries.
--              Las dimensiones físicas se modelan en tiempo real con height (m)
--              y weight (kg), sin almacenar size ni tiers estáticos.
-- =====================================================

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.team',
  coalesce(
    (
      SELECT json_group_array(json_remove(p.value, '$.size'))
      FROM json_each(json_extract(game_saves.save_data, '$.team')) p
      WHERE p.value IS NOT NULL AND json_type(p.value) = 'object'
    ),
    json('[]')
  ),
  '$.box',
  coalesce(
    (
      SELECT json_group_array(json_remove(p.value, '$.size'))
      FROM json_each(json_extract(game_saves.save_data, '$.box')) p
      WHERE p.value IS NOT NULL AND json_type(p.value) = 'object'
    ),
    json('[]')
  )
)
WHERE save_data IS NOT NULL;

UPDATE competition_entries
SET data = json_remove(data, '$.size')
WHERE data IS NOT NULL AND json_extract(data, '$.size') IS NOT NULL;

INSERT INTO system_config (key, value) VALUES ('db_version', '"20260827110000"')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
