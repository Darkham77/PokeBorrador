-- database/migrations/20260421110000_sync_event_seeds.sql

-- 1. Nuclear repair: Drop and recreate to resolve persistent datatype mismatches
DROP TABLE IF EXISTS events_config;

CREATE TABLE events_config (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    type TEXT,
    config TEXT,
    active BOOLEAN DEFAULT 0,
    manual BOOLEAN DEFAULT 0,
    start_at TEXT,
    end_at TEXT,
    schedule TEXT,
    last_awarded_at TEXT,
    updated_at TEXT
);

-- 2. Insertar eventos originales
INSERT INTO events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES ('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', 1, 0, '{"type": "weekly", "days": [6, 0], "startHour": 0, "endHour": 23.99}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!');

INSERT INTO events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES ('dia_pesca', 'Día de Pesca', '🎣', 'passive_bonus', 1, 0, '{"type": "weekly", "days": [2], "startHour": 0, "endHour": 23.99}', '{"fishingMult": 2}', 'Muchas más posibilidades de encuentros de pesca en mapas con agua');

INSERT INTO events_config (id, name, icon, type, active, manual, schedule, config, description)
VALUES ('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', 1, 0, '{"type": "weekly", "days": [2, 4], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "metric": "total_ivs", "hasCompetition": true}', '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!');
