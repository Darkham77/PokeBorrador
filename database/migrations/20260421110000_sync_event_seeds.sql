-- database/migrations/20260421110000_sync_event_seeds.sql

-- Eliminar eventos de prueba previos
DELETE FROM events_config WHERE id = 'entrenamiento_diario';

-- Insertar o actualizar eventos originales
INSERT INTO events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES 
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', 1, 0, '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!'),
('dia_pesca', 'Día de Pesca', '🎣', 'passive_bonus', 1, 0, '{"type": "weekly", "days": [2], "startHour": 0, "endHour": 23.99}', '{"fishingMult": 2}', 'Muchas más posibilidades de encuentros de pesca en mapas con agua'),
('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', 1, 0, '{"type": "weekly", "days": [2, 4], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "metric": "total_ivs", "hasCompetition": true}', '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  type = EXCLUDED.type,
  schedule = EXCLUDED.schedule,
  config = EXCLUDED.config,
  description = EXCLUDED.description;
