-- Crear tabla de Eventos
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    type TEXT,
    active BOOLEAN DEFAULT false,
    manual BOOLEAN DEFAULT false,
    schedule JSONB,
    config JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar eventos por defecto
INSERT INTO events (id, name, icon, type, active, manual, schedule, config, description)
VALUES 
('doble_exp', 'Fin de Semana de Doble EXP', '⚡', 'passive_bonus', false, false, '{"type": "weekly", "days": [6, 0]}', '{"expMult": 2}', '¡EXP x2 en todos los combates durante el fin de semana!'),
('hora_magikarp', 'Hora de Pesca del Magikarp', '🎣', 'competition', false, false, '{"type": "weekly", "days": [2], "startHour": 18, "endHour": 20}', '{"species": "magikarp", "metric": "total_ivs", "prize": null}', '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!')
ON CONFLICT (id) DO NOTHING;

-- Crear tabla de Entradas de Competición
CREATE TABLE IF NOT EXISTS competition_entries (
    id TEXT PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_id TEXT REFERENCES events(id),
    player_email TEXT NOT NULL,
    player_name TEXT,
    data JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla de Premios (Awards)
CREATE TABLE IF NOT EXISTS awards (
    id TEXT PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_id TEXT REFERENCES events(id),
    winner_email TEXT NOT NULL,
    winner_name TEXT,
    prize JSONB,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMPTZ
);
