-- =====================================================
-- POKÉ VICIO — MIGRACIÓN DE PERSISTENCIA: NORMALIZACIÓN DE ITEM IDS EN DAYCARE MISSIONS (SQLite)
-- Fecha: 2026-09-07
-- Descripción: Normaliza IDs de ítems antiguos en las recompensas de misiones de guardería (daycare_missions).
-- =====================================================

UPDATE game_saves
SET save_data = json_set(
  save_data,
  '$.daycare_missions',
  json(
    coalesce(
      (
        SELECT json_group_array(
          json_set(
            mission_item.value,
            '$.reward.id',
            coalesce(
              json_extract(
                '{"berry_bronze":"berrybronze","berry_silver":"berrysilver","berry_gold":"berrygold","everstone":"everstone","destiny_knot":"destinyknot","power_weight":"powerweight","power_bracer":"powerbracer","power_belt":"powerbelt","power_lens":"powerlens","power_band":"powerband","power_anklet":"poweranklet","vigor_restorer":"vigorrestorer"}',
                '$.' || lower(json_extract(mission_item.value, '$.reward.id'))
              ),
              json_extract(mission_item.value, '$.reward.id')
            )
          )
        )
        FROM json_each(json_extract(game_saves.save_data, '$.daycare_missions')) mission_item
      ),
      '[]'
    )
  )
)
WHERE save_data IS NOT NULL AND json_extract(save_data, '$.daycare_missions') IS NOT NULL;

INSERT INTO system_config (key, value)
VALUES ('db_version', '20260907020000')
ON CONFLICT (key)
DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
